// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import static com.digitalasset.quickstart.service.ServiceUtils.ensurePresent;
import static com.digitalasset.quickstart.service.ServiceUtils.traceServiceCallAsync;
import static com.digitalasset.quickstart.utility.TracingUtils.tracingCtx;
import static com.digitalasset.quickstart.utility.Utils.toOffsetDateTime;

import com.digitalasset.quickstart.api.LoansApi;
import com.digitalasset.quickstart.ledger.LedgerApi;
import com.digitalasset.quickstart.ledger.TokenStandardProxy;
import com.digitalasset.quickstart.repository.DamlRepository;
import com.digitalasset.quickstart.repository.TenantPropertiesRepository;
import com.digitalasset.quickstart.security.AuthUtils;
import com.digitalasset.quickstart.tokenstandard.openapi.allocation.model.DisclosedContract;
import com.digitalasset.transcode.java.ContractId;
import com.digitalasset.transcode.java.Party;
import com.google.protobuf.ByteString;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Objects;
import org.openapitools.model.*;
import org.openapitools.jackson.nullable.JsonNullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import quickstart_licensing.loan.creditprofile.CreditProfile;
import quickstart_licensing.loan.loan.Loan;
import quickstart_licensing.loan.loanoffer.LoanOffer;
import quickstart_licensing.loan.loanrequest.LoanRequest;
import quickstart_licensing.loan.loanrequest.LoanRequestForLender;
import quickstart_licensing.loan.loanoffer.FundingIntent;
import quickstart_licensing.loan.loanoffer.FundingIntent.FundingIntent_ConfirmByLender;
import quickstart_licensing.loan.loanoffer.LoanPrincipalRequest;
import quickstart_licensing.loan.loanoffer.LoanOffer.LoanOffer_AcceptWithToken;
import quickstart_licensing.loan.loanrepaymentrequest.LoanRepaymentRequest;
import daml_prim_da_types.da.types.Tuple2;
import splice_api_token_holding_v1.splice.api.token.holdingv1.InstrumentId;
import splice_api_token_metadata_v1.splice.api.token.metadatav1.AnyValue;
import splice_api_token_metadata_v1.splice.api.token.metadatav1.ChoiceContext;
import splice_api_token_metadata_v1.splice.api.token.metadatav1.ExtraArgs;
import com.daml.ledger.api.v2.CommandsOuterClass;
import com.daml.ledger.api.v2.ValueOuterClass;

/**
 * Loan and credit profile API. All operations act as the authenticated party (borrower or lender).
 * Privacy: ledger visibility follows DAML signatories/observers; only relevant contracts are visible.
 */
@RestController
@RequestMapping("${openapi.asset.base-path:}")
public class LoanApiImpl implements LoansApi {

    private static final Logger logger = LoggerFactory.getLogger(LoanApiImpl.class);

    private final LedgerApi ledger;
    private final DamlRepository damlRepository;
    private final AuthUtils auth;
    private final TenantPropertiesRepository tenantPropertiesRepository;
    private final TokenStandardProxy tokenStandardProxy;

    public LoanApiImpl(LedgerApi ledger, DamlRepository damlRepository, AuthUtils auth,
                       TokenStandardProxy tokenStandardProxy,
                       TenantPropertiesRepository tenantPropertiesRepository) {
        this.ledger = ledger;
        this.damlRepository = damlRepository;
        this.auth = auth;
        this.tokenStandardProxy = tokenStandardProxy;
        this.tenantPropertiesRepository = tenantPropertiesRepository;
    }

    /**
     * Proactively disclose all undisclosed LoanRequests to every known lender party.
     * Runs asynchronously after a short delay to allow PQS indexing.
     */
    private void discloseToAllLenders(String borrowerParty, String appProviderPartyId) {
        CompletableFuture.delayedExecutor(2, java.util.concurrent.TimeUnit.SECONDS)
            .execute(() -> {
                try {
                    damlRepository.findActiveLoanRequestsByPlatform(appProviderPartyId)
                        .thenAccept(requests -> {
                            List<String> lenderParties = tenantPropertiesRepository.getAllTenants().values().stream()
                                .map(TenantPropertiesRepository.TenantProperties::getPartyId)
                                .filter(pid -> pid != null && !pid.isEmpty())
                                .filter(pid -> !pid.equals(appProviderPartyId))
                                .filter(pid -> !pid.equals(borrowerParty))
                                .toList();

                            for (var req : requests) {
                                for (String lenderParty : lenderParties) {
                                    var choice = new LoanRequest.LoanRequest_DiscloseToLender(new Party(lenderParty));
                                    ledger.exerciseAndGetResult(
                                        req.contractId, choice,
                                        UUID.randomUUID().toString(),
                                        appProviderPartyId)
                                    .exceptionally(ex -> {
                                        logger.debug("[discloseToAllLenders] skipped lender={} request={}: {}",
                                            lenderParty, req.contractId.getContractId, ex.getMessage());
                                        return null;
                                    });
                                }
                            }
                            logger.info("[discloseToAllLenders] disclosed {} request(s) to {} lender(s)",
                                requests.size(), lenderParties.size());
                        })
                        .exceptionally(ex -> {
                            logger.warn("[discloseToAllLenders] failed to query platform requests", ex);
                            return null;
                        });
                } catch (Exception ex) {
                    logger.warn("[discloseToAllLenders] unexpected error", ex);
                }
            });
    }

    @Override
    @WithSpan
    @PostMapping("/loans/request")
    @ResponseBody
    public CompletableFuture<ResponseEntity<org.openapitools.model.LoanRequest>> createLoanRequest(
            String commandId, LoanRequestCreate loanRequestCreate) {
        logger.info("[createLoanRequest] REQUEST RECEIVED amount={} rate={} days={} purpose={}",
                loanRequestCreate != null ? loanRequestCreate.getAmount() : null,
                loanRequestCreate != null ? loanRequestCreate.getInterestRate() : null,
                loanRequestCreate != null ? loanRequestCreate.getDurationDays() : null,
                loanRequestCreate != null ? loanRequestCreate.getPurpose() : null);
        var ctx = tracingCtx(logger, "createLoanRequest");
        return auth.asAuthenticatedParty(party -> {
            logger.info("[createLoanRequest] party={}", party);
            return traceServiceCallAsync(ctx, () -> {
                    Instant now = Instant.now();
                    BigDecimal amount = loanRequestCreate.getAmount() != null ? BigDecimal.valueOf(loanRequestCreate.getAmount()) : BigDecimal.ZERO;
                    BigDecimal rate = loanRequestCreate.getInterestRate() != null ? BigDecimal.valueOf(loanRequestCreate.getInterestRate()) : BigDecimal.ZERO;
                    int daysInt = loanRequestCreate.getDurationDays() != null ? loanRequestCreate.getDurationDays() : 0;
                    long days = daysInt;
                    LoanRequest template = new LoanRequest(
                            new Party(party),
                            new Party(auth.getAppProviderPartyId()), // platform observer
                            amount,
                            rate,
                            days,
                            loanRequestCreate.getPurpose() != null ? loanRequestCreate.getPurpose() : "",
                            now);
                    String cmdId = commandId != null ? commandId : UUID.randomUUID().toString();
                    String purpose = loanRequestCreate.getPurpose() != null ? loanRequestCreate.getPurpose() : "";
                    return ledger.create(template, cmdId, party)
                            .thenCompose(v -> {
                                logger.info("[createLoanRequest] ledger write done party={} amount={} rate={} days={}", party, amount, rate, daysInt);
                                discloseToAllLenders(party, auth.getAppProviderPartyId());
                                // Wait 1s for PQS to index the new contract, then resolve the real contractId
                                CompletableFuture<Void> delay = new CompletableFuture<>();
                                CompletableFuture.delayedExecutor(1, java.util.concurrent.TimeUnit.SECONDS)
                                        .execute(() -> delay.complete(null));
                                return delay.thenCompose(_unused ->
                                        damlRepository.findActiveLoanRequestsByBorrower(party)
                                                .thenApply(reqs -> {
                                                    String cid = reqs.stream()
                                                            .filter(r -> purpose.equals(r.payload.getPurpose)
                                                                    && amount.compareTo(r.payload.getAmount) == 0)
                                                            .map(r -> r.contractId.getContractId)
                                                            .findFirst()
                                                            .orElse("");
                                                    logger.info("[createLoanRequest] resolved contractId={}", cid);
                                                    org.openapitools.model.LoanRequest body = new org.openapitools.model.LoanRequest();
                                                    body.setContractId(cid);
                                                    body.setBorrower(party);
                                                    body.setAmount(amount);
                                                    body.setInterestRate(rate);
                                                    body.setDurationDays(daysInt);
                                                    body.setPurpose(purpose);
                                                    body.setCreatedAt(toOffsetDateTime(now));
                                                    return ResponseEntity.status(HttpStatus.CREATED).body(body);
                                                }));
                            })
                            .exceptionally(ex -> {
                                logger.error("[createLoanRequest] FAILED party={} amount={}", party, amount, ex);
                                throw new java.util.concurrent.CompletionException(ex);
                            });
                });
        });
    }

    @Override
    @WithSpan
    @PostMapping("/loans/offer")
    @ResponseBody
    public CompletableFuture<ResponseEntity<org.openapitools.model.LoanOffer>> createLoanOffer(
            String commandId, LoanOfferCreate loanOfferCreate) {
        logger.info("[createLoanOffer] REQUEST RECEIVED loanRequestId={} amount={} rate={}",
                loanOfferCreate != null ? loanOfferCreate.getLoanRequestId() : "null",
                loanOfferCreate != null ? loanOfferCreate.getAmount() : null,
                loanOfferCreate != null ? loanOfferCreate.getInterestRate() : null);
        var ctx = tracingCtx(logger, "createLoanOffer");
        return auth.asAuthenticatedParty(party -> {
            String reqId = loanOfferCreate.getLoanRequestId();
            logger.info("[createLoanOffer] party={} loanRequestId={} (length={}, contains::={})",
                    party, reqId, reqId != null ? reqId.length() : 0, reqId != null && reqId.contains("::"));
            String appProviderPartyId = auth.getAppProviderPartyId();
            return traceServiceCallAsync(ctx, () ->
                        // Lender UI sends LoanRequestForLender contract id; lender does not see LoanRequest directly.
                        damlRepository.findLoanRequestForLenderById(loanOfferCreate.getLoanRequestId())
                                .thenCompose(optForLender -> {
                                    if (optForLender.isEmpty()) {
                                        logger.warn("[createLoanOffer] LoanRequestForLender NOT FOUND for id={} (will try LoanRequest fallback)", loanOfferCreate.getLoanRequestId());
                                    }
                                    if (optForLender.isPresent()) {
                                        com.digitalasset.quickstart.pqs.Contract<LoanRequestForLender> forLender = optForLender.get();
                                        Instant now = Instant.now();
                                        // DAML: only the lender party can create LoanOffer (signatory). Log to verify party match.
                                        logger.info("[createLoanOffer] Submitting LoanOffer as party={} (must be lender); LoanRequest borrower={}",
                                                party, forLender.payload.getBorrower.getParty);
                                        BigDecimal amount = loanOfferCreate.getAmount() != null && loanOfferCreate.getAmount().compareTo(BigDecimal.ZERO) > 0
                                                ? loanOfferCreate.getAmount() : forLender.payload.getAmount;
                                        BigDecimal rate = loanOfferCreate.getInterestRate() != null && loanOfferCreate.getInterestRate().compareTo(BigDecimal.ZERO) > 0
                                                ? loanOfferCreate.getInterestRate() : forLender.payload.getInterestRate;
                                        long durationDays = (loanOfferCreate.getDurationDays() != null && loanOfferCreate.getDurationDays() > 0)
                                                ? loanOfferCreate.getDurationDays().longValue()
                                                : (forLender.payload.getDurationDays != null ? forLender.payload.getDurationDays : 360L);
                                        // Use the underlying LoanRequest contract id from the ForLender payload, not the wrapper's id.
                                        LoanOffer template = new LoanOffer(
                                                new Party(party),
                                                forLender.payload.getBorrower,
                                                amount,
                                                rate,
                                                durationDays,
                                                now,
                                                forLender.payload.getRequestId);
                                        String offerCmdId = commandId != null ? commandId : UUID.randomUUID().toString();
                                        String borrowerPartyForLender = forLender.payload.getBorrower.getParty;
                                        final BigDecimal finalAmount = amount;
                                        return ledger.create(template, offerCmdId, party)
                                                .thenCompose(v -> {
                                                    logger.info("[createLoanOffer] ledger write done from LoanRequestForLender party={} amount={} rate={}", party, finalAmount, rate);
                                                    CompletableFuture<Void> delay = new CompletableFuture<>();
                                                    CompletableFuture.delayedExecutor(1, java.util.concurrent.TimeUnit.SECONDS).execute(() -> delay.complete(null));
                                                    return delay.thenCompose(_unused ->
                                                            damlRepository.findActiveLoanOffersByLenderOrBorrower(party)
                                                                    .thenApply(offers -> {
                                                                        long dur = durationDays;
                                                                        String cid = offers.stream()
                                                                                .filter(o -> party.equals(o.payload.getLender.getParty)
                                                                                        && borrowerPartyForLender.equals(o.payload.getBorrower.getParty)
                                                                                        && finalAmount.compareTo(o.payload.getAmount) == 0
                                                                                        && o.payload.getDurationDays != null && o.payload.getDurationDays == dur)
                                                                                .map(o -> o.contractId.getContractId)
                                                                                .findFirst()
                                                                                .orElseGet(() -> offers.stream()
                                                                                        .filter(o -> party.equals(o.payload.getLender.getParty)
                                                                                                && borrowerPartyForLender.equals(o.payload.getBorrower.getParty)
                                                                                                && finalAmount.compareTo(o.payload.getAmount) == 0)
                                                                                        .map(o -> o.contractId.getContractId)
                                                                                        .findFirst().orElse(""));
                                                                        logger.info("[createLoanOffer] resolved contractId={}", cid);
                                                                        org.openapitools.model.LoanOffer body = new org.openapitools.model.LoanOffer();
                                                                        body.setContractId(cid);
                                                                        body.setLender(party);
                                                                        body.setBorrower(borrowerPartyForLender);
                                                                        body.setAmount(finalAmount);
                                                                        body.setInterestRate(rate);
                                                                        body.setDurationDays((int) durationDays);
                                                                        body.setCreatedAt(toOffsetDateTime(now));
                                                                        return ResponseEntity.status(HttpStatus.CREATED).body(body);
                                                                    }));
                                                });
                                    }
                                    // Fallback: client may have sent LoanRequest id (e.g. from borrower flow or resolved id).
                                    return damlRepository.findLoanRequestById(loanOfferCreate.getLoanRequestId())
                                            .thenCompose(optReq -> {
                                                if (optReq.isPresent()) {
                                                    return CompletableFuture.completedFuture(optReq);
                                                }
                                                logger.warn("[createLoanOffer] LoanRequest not found for id={}, trying platform-request-list fallback", loanOfferCreate.getLoanRequestId());
                                                final String wantedId = loanOfferCreate.getLoanRequestId();
                                                return damlRepository.findActiveLoanRequestsByPlatform(appProviderPartyId)
                                                        .thenApply(platformList -> {
                                                            // Match by exact contractId or suffix
                                                            return platformList.stream()
                                                                    .filter(r -> {
                                                                        String cid = r.contractId.getContractId;
                                                                        return cid.equals(wantedId)
                                                                                || cid.endsWith(wantedId)
                                                                                || wantedId.endsWith(cid);
                                                                    })
                                                                    .findFirst()
                                                                    .map(r -> {
                                                                        logger.info("[createLoanOffer] matched platform request by contractId");
                                                                        return r;
                                                                    });
                                                        });
                                            })
                                            .thenCompose(optReq -> {
                                                var req = ensurePresent(optReq, "LoanRequest not found: %s", loanOfferCreate.getLoanRequestId());
                                                Instant now = Instant.now();
                                                logger.info("[createLoanOffer] Submitting LoanOffer as party={} (must be lender); LoanRequest borrower={}",
                                                        party, req.payload.getBorrower.getParty);
                                                BigDecimal amount = loanOfferCreate.getAmount() != null && loanOfferCreate.getAmount().compareTo(BigDecimal.ZERO) > 0
                                                        ? loanOfferCreate.getAmount() : req.payload.getAmount;
                                                BigDecimal rate = loanOfferCreate.getInterestRate() != null && loanOfferCreate.getInterestRate().compareTo(BigDecimal.ZERO) > 0
                                                        ? loanOfferCreate.getInterestRate() : req.payload.getInterestRate;
                                                long durationDaysFallback = (loanOfferCreate.getDurationDays() != null && loanOfferCreate.getDurationDays() > 0)
                                                        ? loanOfferCreate.getDurationDays().longValue()
                                                        : (req.payload.getDurationDays != null ? req.payload.getDurationDays : 360L);
                                                LoanOffer template = new LoanOffer(
                                                        new Party(party),
                                                        req.payload.getBorrower,
                                                        amount,
                                                        rate,
                                                        durationDaysFallback,
                                                        now,
                                                        req.contractId);
                                                String fallbackCmdId = commandId != null ? commandId : UUID.randomUUID().toString();
                                                String borrowerPartyFallback = req.payload.getBorrower.getParty;
                                                final BigDecimal finalAmountFallback = amount;
                                                return ledger.create(template, fallbackCmdId, party)
                                                        .thenCompose(v -> {
                                                            logger.info("[createLoanOffer] ledger write done from LoanRequest party={} amount={} rate={}", party, finalAmountFallback, rate);
                                                            CompletableFuture<Void> delay = new CompletableFuture<>();
                                                            CompletableFuture.delayedExecutor(1, java.util.concurrent.TimeUnit.SECONDS).execute(() -> delay.complete(null));
                                                            return delay.thenCompose(_unused ->
                                                                    damlRepository.findActiveLoanOffersByLenderOrBorrower(party)
                                                                            .thenApply(offers -> {
                                                                                String cid = offers.stream()
                                                                                        .filter(o -> party.equals(o.payload.getLender.getParty)
                                                                                                && borrowerPartyFallback.equals(o.payload.getBorrower.getParty)
                                                                                                && finalAmountFallback.compareTo(o.payload.getAmount) == 0)
                                                                                        .map(o -> o.contractId.getContractId)
                                                                                        .findFirst().orElse("");
                                                                                logger.info("[createLoanOffer] resolved contractId={}", cid);
                                                                                org.openapitools.model.LoanOffer body = new org.openapitools.model.LoanOffer();
                                                                                body.setContractId(cid);
                                                                                body.setLender(party);
                                                                                body.setBorrower(borrowerPartyFallback);
                                                                                body.setAmount(finalAmountFallback);
                                                                                body.setInterestRate(rate);
                                                                                body.setDurationDays((int) durationDaysFallback);
                                                                                body.setCreatedAt(toOffsetDateTime(now));
                                                                                return ResponseEntity.status(HttpStatus.CREATED).body(body);
                                                                            }));
                                                        });
                                            });
                                }));
        });
    }

    @Override
    @WithSpan
    public CompletableFuture<ResponseEntity<LoanFundResult>> fundLoan(
            String contractId, String commandId, LoanFundRequest loanFundRequest) {
        var ctx = tracingCtx(logger, "fundLoan", "contractId", contractId);
        return auth.asAuthenticatedParty(party -> {
            logger.info("[fundLoan] party={} offerContractId={} creditProfileId={}", party, contractId, loanFundRequest.getCreditProfileId());
            return traceServiceCallAsync(ctx, () ->
                        damlRepository.findLoanOfferById(contractId)
                                .thenCompose(optOffer -> {
                                    var offer = ensurePresent(optOffer, "LoanOffer not found: %s", contractId);
                                    // Validate that the authenticated party is the borrower (required by LoanOffer_Accept controller)
                                    String borrowerParty = offer.payload.getBorrower.getParty;
                                    if (!party.equals(borrowerParty)) {
                                        logger.warn("[fundLoan] FORBIDDEN: party {} is not the borrower {} of offer {}", party, borrowerParty, contractId);
                                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                                String.format("Only the borrower (%s) can accept this offer. You are logged in as %s. Please log in as the borrower (app-user).", borrowerParty, party));
                                    }
                                    var choice = new LoanOffer.LoanOffer_Accept(
                                            new ContractId<>(loanFundRequest.getCreditProfileId()));
                                    return ledger.exerciseAndGetResult(
                                                    offer.contractId, choice,
                                                    commandId != null ? commandId : UUID.randomUUID().toString(),
                                                    party)
                                            .thenApply(resultPair -> {
                                                LoanFundResult result = new LoanFundResult();
                                                result.setLoanId(resultPair.get_1.getContractId);
                                                logger.info("[fundLoan] completed loanId={}", result.getLoanId());
                                                return ResponseEntity.ok(result);
                                            })
                                            .exceptionally(ex -> {
                                                Throwable cause = ex.getCause() != null ? ex.getCause() : ex;
                                                String msg = cause.getMessage();
                                                if (msg != null && msg.contains("CONTRACT_NOT_FOUND")) {
                                                    logger.warn("[fundLoan] CONTRACT_NOT_FOUND (offer or underlying request no longer valid): {}", msg);
                                                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                                                            "This offer is no longer valid. The underlying loan request was already accepted or has been cancelled. Please pick an offer from your current list.");
                                                }
                                                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, msg != null ? msg : "Funding failed", cause);
                                            });
                                }));
        });
    }

    @WithSpan
    @PostMapping("/loans/offer/{contractId}:accept-with-token")
    @ResponseBody
    public CompletableFuture<ResponseEntity<FundingIntentResult>> acceptLoanOfferWithToken(
            @PathVariable("contractId") String contractId,
            String commandId,
            AcceptOfferWithTokenRequest request) {
        var ctx = tracingCtx(logger, "acceptLoanOfferWithToken", "contractId", contractId);
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () -> {
            var offerFut = damlRepository.findLoanOfferById(contractId);
            var adminIdFut = tokenStandardProxy.getRegistryAdminId();
            return offerFut.thenCombine(adminIdFut, (optOffer, adminId) -> {
                var offer = ensurePresent(optOffer, "LoanOffer not found: %s", contractId);
                String borrowerParty = offer.payload.getBorrower.getParty;
                if (!party.equals(borrowerParty)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            String.format("Only the borrower (%s) can request token funding. You are logged in as %s.",
                                    borrowerParty, party));
                }
                String requestId = request.getRequestId().isPresent() && !request.getRequestId().get().isBlank()
                        ? request.getRequestId().get()
                        : UUID.randomUUID().toString();
                Duration prepareDelta = request.getPrepareUntilDuration().isPresent()
                        ? Duration.parse(request.getPrepareUntilDuration().get())
                        : Duration.ofHours(2);
                Duration settleDelta = request.getSettleBeforeDuration().isPresent()
                        ? Duration.parse(request.getSettleBeforeDuration().get())
                        : Duration.ofHours(24);
                Instant now = Instant.now();
                var choice = new LoanOffer_AcceptWithToken(
                        requestId,
                        new InstrumentId(new Party(adminId), "Amulet"),
                        now.plus(prepareDelta),
                        now.plus(settleDelta),
                        request.getDescription().isPresent() ? request.getDescription().get() : "Token-based loan funding",
                        new ContractId<>(request.getCreditProfileId())
                );
                return ledger.exerciseAndGetResult(
                                offer.contractId,
                                choice,
                                commandId != null ? commandId : UUID.randomUUID().toString(),
                                party)
                        .thenApply(intentCid -> {
                            FundingIntentResult result = new FundingIntentResult();
                            result.setFundingIntentId(intentCid.getContractId);
                            return ResponseEntity.status(HttpStatus.CREATED).body(result);
                        });
            }).thenCompose(x -> x);
        }));
    }

    @WithSpan
    @PostMapping("/loans/funding-intent/{contractId}:confirm")
    @ResponseBody
    public CompletableFuture<ResponseEntity<LoanPrincipalRequestResult>> confirmFundingIntent(
            @PathVariable("contractId") String contractId,
            String commandId) {
        var ctx = tracingCtx(logger, "confirmFundingIntent", "contractId", contractId);
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findFundingIntentById(contractId).thenCompose(optIntent -> {
                    var intent = ensurePresent(optIntent, "FundingIntent not found: %s", contractId);
                    String lenderParty = intent.payload.getLender.getParty;
                    if (!party.equals(lenderParty)) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                String.format("Only the lender (%s) can confirm funding. You are logged in as %s.",
                                        lenderParty, party));
                    }
                    var choice = new FundingIntent_ConfirmByLender();
                    return ledger.exerciseAndGetResult(
                                    intent.contractId,
                                    choice,
                                    commandId != null ? commandId : UUID.randomUUID().toString(),
                                    party)
                            .thenApply(prCid -> {
                                LoanPrincipalRequestResult result = new LoanPrincipalRequestResult();
                                result.setPrincipalRequestId(prCid.getContractId);
                                return ResponseEntity.status(HttpStatus.CREATED).body(result);
                            });
                })
        ));
    }

    @WithSpan
    @GetMapping("/loans/funding-intents")
    public CompletableFuture<ResponseEntity<List<LoanFundingIntent>>> listFundingIntents() {
        var ctx = tracingCtx(logger, "listFundingIntents");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () -> {
            var byBorrower = damlRepository.findFundingIntentsByBorrower(party);
            var byLender = damlRepository.findFundingIntentsByLender(party);
            return byBorrower.thenCombine(byLender, (borrowerList, lenderList) -> {
                var map = new HashMap<String, com.digitalasset.quickstart.pqs.Contract<FundingIntent>>();
                borrowerList.forEach(c -> map.put(c.contractId.getContractId, c));
                lenderList.forEach(c -> map.put(c.contractId.getContractId, c));
                List<LoanFundingIntent> api = map.values().stream()
                        .sorted(Comparator.comparing(c -> c.payload.getRequestedAt))
                        .map(LoanApiImpl::toFundingIntentApi)
                        .toList();
                return ResponseEntity.ok(api);
            });
        }));
    }

    @WithSpan
    @GetMapping("/loans/principal-requests")
    public CompletableFuture<ResponseEntity<List<LoanPrincipalRequestSummary>>> listPrincipalRequests() {
        var ctx = tracingCtx(logger, "listPrincipalRequests");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findLoanPrincipalRequestsByLender(party).thenApply(list -> {
                    Instant now = Instant.now();
                    List<LoanPrincipalRequestSummary> api = list.stream()
                            .map(r -> toLoanPrincipalRequestApi(r, now))
                            .toList();
                    return ResponseEntity.ok(api);
                })
        ));
    }

    @WithSpan
    @PostMapping("/loans/principal-requests/{contractId}:complete-funding")
    @ResponseBody
    public CompletableFuture<ResponseEntity<LoanFundResult>> completeLoanFunding(
            @PathVariable("contractId") String contractId,
            String commandId,
            CompleteLoanFundingRequest request) {
        var ctx = tracingCtx(logger, "completeLoanFunding", "contractId", contractId);
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () -> {
            var choiceContextFut = tokenStandardProxy.getAllocationTransferContext(request.getAllocationContractId());
            var principalFut = damlRepository.findLoanPrincipalRequestById(contractId);
            return choiceContextFut.thenCombine(principalFut, (c, r) -> {
                var choiceContext = ensurePresent(c, "Transfer context not found for allocation %s", request.getAllocationContractId());
                var principal = ensurePresent(r, "LoanPrincipalRequest not found: %s", contractId);
                String lenderParty = principal.payload.getLender.getParty;
                if (!party.equals(lenderParty)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            String.format("Only the lender (%s) can complete funding. You are logged in as %s.",
                                    lenderParty, party));
                }
                TransferContext transferContext = prepareTransferContext(
                        choiceContext.getDisclosedContracts(),
                        Map.of(
                                "AmuletRules", "amulet-rules",
                                "OpenMiningRound", "open-round"
                        )
                );
                LoanPrincipalRequest.LoanPrincipalRequest_CompleteFunding choice =
                        new LoanPrincipalRequest.LoanPrincipalRequest_CompleteFunding(
                                new ContractId<>(request.getAllocationContractId()),
                                transferContext.extraArgs
                        );
                return ledger.exerciseAndGetResult(
                                principal.contractId,
                                choice,
                                commandId != null ? commandId : UUID.randomUUID().toString(),
                                transferContext.disclosedContracts,
                                party)
                        .thenApply(loanCid -> {
                            LoanFundResult result = new LoanFundResult();
                            result.setLoanId(loanCid.getContractId);
                            return ResponseEntity.ok(result);
                        });
            }).thenCompose(x -> x);
        }));
    }

    @WithSpan
    @PostMapping("/loans/{contractId}:request-repayment")
    @ResponseBody
    public CompletableFuture<ResponseEntity<LoanRepaymentRequestResult>> requestLoanRepayment(
            @PathVariable("contractId") String contractId,
            String commandId,
            RequestRepaymentRequest request) {
        var ctx = tracingCtx(logger, "requestLoanRepayment", "contractId", contractId);
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () -> {
            var loanFut = damlRepository.findLoanById(contractId);
            var adminIdFut = tokenStandardProxy.getRegistryAdminId();
            return loanFut.thenCombine(adminIdFut, (optLoan, adminId) -> {
                var loan = ensurePresent(optLoan, "Loan not found: %s", contractId);
                String borrowerParty = loan.payload.getBorrower.getParty;
                if (!party.equals(borrowerParty)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            String.format("Only the borrower (%s) can request repayment. You are logged in as %s.",
                                    borrowerParty, party));
                }
                String requestId = request.getRequestId().isPresent() && !request.getRequestId().get().isBlank()
                        ? request.getRequestId().get()
                        : UUID.randomUUID().toString();
                Duration prepareDelta = request.getPrepareUntilDuration().isPresent()
                        ? Duration.parse(request.getPrepareUntilDuration().get())
                        : Duration.ofHours(2);
                Duration settleDelta = request.getSettleBeforeDuration().isPresent()
                        ? Duration.parse(request.getSettleBeforeDuration().get())
                        : Duration.ofHours(24);
                Instant now = Instant.now();
                var choice = new Loan.Loan_RequestRepayment(
                        requestId,
                        new InstrumentId(new Party(adminId), "Amulet"),
                        now.plus(prepareDelta),
                        now.plus(settleDelta),
                        request.getDescription().isPresent() ? request.getDescription().get() : "Token-based loan repayment"
                );
                return ledger.exerciseAndGetResult(
                                loan.contractId,
                                choice,
                                commandId != null ? commandId : UUID.randomUUID().toString(),
                                party)
                        .thenApply(rrCid -> {
                            LoanRepaymentRequestResult result = new LoanRepaymentRequestResult();
                            result.setRepaymentRequestId(rrCid.getContractId);
                            return ResponseEntity.status(HttpStatus.CREATED).body(result);
                        });
            }).thenCompose(x -> x);
        }));
    }

    @WithSpan
    @GetMapping("/loans/repayment-requests")
    public CompletableFuture<ResponseEntity<List<LoanRepaymentRequestSummary>>> listRepaymentRequests() {
        var ctx = tracingCtx(logger, "listRepaymentRequests");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () -> {
            var byBorrower = damlRepository.findLoanRepaymentRequestsByBorrower(party);
            var byLender = damlRepository.findLoanRepaymentRequestsByLender(party);
            return byBorrower.thenCombine(byLender, (borrowerList, lenderList) -> {
                var map = new HashMap<String, LoanRepaymentRequestSummary>();
                Instant now = Instant.now();
                borrowerList.forEach(c -> map.put(c.contractId.getContractId, toLoanRepaymentRequestApi(c, Optional.empty(), now)));
                lenderList.forEach(c -> map.put(c.repaymentRequest().contractId.getContractId,
                        toLoanRepaymentRequestApi(c.repaymentRequest(), c.allocationCid(), now)));
                List<LoanRepaymentRequestSummary> api = map.values().stream()
                        .sorted(Comparator.comparing(LoanRepaymentRequestSummary::getRequestedAt))
                        .toList();
                return ResponseEntity.ok(api);
            });
        }));
    }

    @WithSpan
    @PostMapping("/loans/repayment-requests/{contractId}:complete-repayment")
    @ResponseBody
    public CompletableFuture<ResponseEntity<LoanRepaymentResult>> completeLoanRepayment(
            @PathVariable("contractId") String contractId,
            String commandId,
            CompleteLoanRepaymentRequest request) {
        var ctx = tracingCtx(logger, "completeLoanRepayment", "contractId", contractId);
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () -> {
            var choiceContextFut = tokenStandardProxy.getAllocationTransferContext(request.getAllocationContractId());
            var repaymentFut = damlRepository.findLoanRepaymentRequestById(contractId);
            return choiceContextFut.thenCombine(repaymentFut, (c, r) -> {
                var choiceContext = ensurePresent(c, "Transfer context not found for allocation %s", request.getAllocationContractId());
                var repayment = ensurePresent(r, "LoanRepaymentRequest not found: %s", contractId);
                String lenderParty = repayment.payload.getLender.getParty;
                if (!party.equals(lenderParty)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            String.format("Only the lender (%s) can complete repayment. You are logged in as %s.",
                                    lenderParty, party));
                }
                TransferContext transferContext = prepareTransferContext(
                        choiceContext.getDisclosedContracts(),
                        Map.of(
                                "AmuletRules", "amulet-rules",
                                "OpenMiningRound", "open-round"
                        )
                );
                LoanRepaymentRequest.LoanRepaymentRequest_CompleteRepayment choice =
                        new LoanRepaymentRequest.LoanRepaymentRequest_CompleteRepayment(
                                new ContractId<>(request.getAllocationContractId()),
                                transferContext.extraArgs
                        );
                String cmdId = commandId != null ? commandId : UUID.randomUUID().toString();
                return ledger.exerciseAndGetResult(
                                repayment.contractId,
                                choice,
                                cmdId,
                                transferContext.disclosedContracts,
                                party)
                        .thenCompose(_unused -> {
                            // CompleteRepayment only does the token transfer; complete the loan separately
                            ContractId<Loan> loanCid = new ContractId<>(repayment.payload.getLoanContractIdText);
                            var completeChoice = new Loan.Loan_CompleteRepaymentReceived();
                            return ledger.exerciseAndGetResult(
                                            loanCid,
                                            completeChoice,
                                            UUID.randomUUID().toString(),
                                            party)
                                    .thenApply(tuple -> {
                                        LoanRepaymentResult result = new LoanRepaymentResult();
                                        result.setCreditProfileId(tuple.get_1.getContractId);
                                        return ResponseEntity.ok(result);
                                    });
                        });
            }).thenCompose(x -> x);
        }));
    }

    @Override
    @WithSpan
    public CompletableFuture<ResponseEntity<Void>> repayLoan(String contractId, String commandId) {
        var ctx = tracingCtx(logger, "repayLoan", "contractId", contractId);
        return auth.asAuthenticatedParty(party -> {
            logger.info("[repayLoan] party={} loanContractId={}", party, contractId);
            return traceServiceCallAsync(ctx, () ->
                        damlRepository.findLoanById(contractId)
                                .thenCompose(optLoan -> {
                                    var loan = ensurePresent(optLoan, "Loan not found: %s", contractId);
                                    var choice = new Loan.Loan_RepayLoan();
                                    return ledger.exerciseAndGetResult(
                                            loan.contractId, choice,
                                            commandId != null ? commandId : UUID.randomUUID().toString(),
                                            party)
                                            .thenApply(v -> {
                                                logger.info("[repayLoan] completed loanContractId={}", contractId);
                                                return ResponseEntity.<Void>ok().build();
                                            });
                                }));
        });
    }

    @WithSpan
    @PostMapping("/loans/{contractId}:mark-default")
    @ResponseBody
    public CompletableFuture<ResponseEntity<Void>> markLoanDefault(
            @PathVariable("contractId") String contractId, String commandId) {
        var ctx = tracingCtx(logger, "markLoanDefault", "contractId", contractId);
        return auth.asAuthenticatedParty(party -> {
            logger.info("[markLoanDefault] party={} loanContractId={}", party, contractId);
            return traceServiceCallAsync(ctx, () ->
                        damlRepository.findLoanById(contractId)
                                .thenCompose(optLoan -> {
                                    var loan = ensurePresent(optLoan, "Loan not found: %s", contractId);
                                    var choice = new Loan.Loan_MarkDefault();
                                    return ledger.exerciseAndGetResult(
                                            loan.contractId, choice,
                                            commandId != null ? commandId : UUID.randomUUID().toString(),
                                            party)
                                            .thenApply(v -> {
                                                logger.info("[markLoanDefault] completed loanContractId={}", contractId);
                                                return ResponseEntity.<Void>ok().build();
                                            });
                                }));
        });
    }

    /**
     * Aggregate platform statistics computed from all active Loan contracts visible to the PQS node.
     * Returns live on-chain data: TVL, loan count, average rate, unique parties.
     */
    @WithSpan
    @GetMapping("/platform-stats")
    public CompletableFuture<ResponseEntity<org.openapitools.model.PlatformStats>> getPlatformStats() {
        var ctx = tracingCtx(logger, "getPlatformStats");
        return auth.asAuthenticatedParty(party ->
                traceServiceCallAsync(ctx, () ->
                        damlRepository.findAllActiveLoans().thenApply(loans -> {
                            var active = loans.stream()
                                    .filter(c -> {
                                        var s = c.payload.getStatus;
                                        return s == null || s.toString().equals("Active");
                                    })
                                    .toList();
                            double tvl = active.stream()
                                    .mapToDouble(c -> c.payload.getPrincipal.doubleValue())
                                    .sum();
                            double avgRate = active.isEmpty() ? 0.0 : active.stream()
                                    .mapToDouble(c -> c.payload.getInterestRate.doubleValue())
                                    .average().orElse(0.0);
                            long distinctLenders = active.stream()
                                    .map(c -> c.payload.getLender.getParty)
                                    .distinct().count();
                            long distinctBorrowers = active.stream()
                                    .map(c -> c.payload.getBorrower.getParty)
                                    .distinct().count();

                            org.openapitools.model.PlatformStats stats = new org.openapitools.model.PlatformStats();
                            stats.setTotalValueLocked(BigDecimal.valueOf(tvl));
                            stats.setTotalLoansOriginated(BigDecimal.valueOf(loans.size()));
                            stats.setAverageInterestRate(BigDecimal.valueOf(avgRate));
                            stats.setActiveLoans(active.size());
                            stats.setTotalLenders((int) distinctLenders);
                            stats.setTotalBorrowers((int) distinctBorrowers);
                            logger.info("[getPlatformStats] tvl={} activeLoans={} lenders={} borrowers={}",
                                    tvl, active.size(), distinctLenders, distinctBorrowers);
                            return ResponseEntity.ok(stats);
                        })
                )
        );
    }

    /** List loan offers visible to the authenticated party (lender or borrower). Not in generated LoansApi; mapped explicitly. */
    @WithSpan
    @GetMapping("/loan-offers")
    public CompletableFuture<ResponseEntity<List<org.openapitools.model.LoanOffer>>> listLoanOffers() {
        var ctx = tracingCtx(logger, "listLoanOffers");
        return auth.asAuthenticatedParty(party -> {
            logger.info("[listLoanOffers] party={}", party);
            return traceServiceCallAsync(ctx, () ->
                    damlRepository.findActiveLoanOffersByLenderOrBorrower(party)
                            .thenApply(contracts -> {
                                logger.debug("[listLoanOffers] party={} returned {} offer(s)", party, contracts.size());
                                return ResponseEntity.ok(contracts.stream()
                                        .map(LoanApiImpl::toLoanOfferApi)
                                        .toList());
                            }));
        });
    }

    private static org.openapitools.model.LoanOffer toLoanOfferApi(
            com.digitalasset.quickstart.pqs.Contract<LoanOffer> c) {
        var p = c.payload;
        org.openapitools.model.LoanOffer api = new org.openapitools.model.LoanOffer();
        api.setContractId(c.contractId.getContractId);
        if (p.getLoanRequestId != null) {
            api.setLoanRequestId(p.getLoanRequestId.getContractId);
        }
        api.setLender(p.getLender.getParty);
        api.setBorrower(p.getBorrower.getParty);
        api.setAmount(p.getAmount);
        api.setInterestRate(p.getInterestRate);
        if (p.getDurationDays != null) {
            api.setDurationDays(p.getDurationDays.intValue());
        }
        api.setCreatedAt(toOffsetDateTime(p.getCreatedAt));
        return api;
    }

    private static LoanFundingIntent toFundingIntentApi(
            com.digitalasset.quickstart.pqs.Contract<FundingIntent> c) {
        var p = c.payload;
        var api = new LoanFundingIntent();
        api.setContractId(c.contractId.getContractId);
        api.setRequestId(p.getRequestId);
        api.setLender(p.getLender.getParty);
        api.setBorrower(p.getBorrower.getParty);
        api.setPrincipal(p.getPrincipal);
        api.setInterestRate(p.getInterestRate);
        api.setDurationDays(p.getDurationDays.intValue());
        api.setPrepareUntil(toOffsetDateTime(p.getPrepareUntil));
        api.setSettleBefore(toOffsetDateTime(p.getSettleBefore));
        api.setRequestedAt(toOffsetDateTime(p.getRequestedAt));
        api.setDescription(JsonNullable.of(p.getDescription));
        api.setLoanRequestId(p.getLoanRequestId.getContractId);
        api.setOfferContractId(p.getOfferContractId.getContractId);
        api.setCreditProfileId(p.getCreditProfileId.getContractId);
        return api;
    }

    private static LoanPrincipalRequestSummary toLoanPrincipalRequestApi(
            DamlRepository.LoanPrincipalRequestWithAllocationCid c,
            Instant now) {
        var p = c.principalRequest().payload;
        var api = new LoanPrincipalRequestSummary();
        api.setContractId(c.principalRequest().contractId.getContractId);
        api.setRequestId(p.getRequestId);
        api.setLender(p.getLender.getParty);
        api.setBorrower(p.getBorrower.getParty);
        api.setPrincipal(p.getPrincipal);
        api.setInterestRate(p.getInterestRate);
        api.setDurationDays(p.getDurationDays.intValue());
        api.setPrepareUntil(toOffsetDateTime(p.getPrepareUntil));
        api.setSettleBefore(toOffsetDateTime(p.getSettleBefore));
        api.setRequestedAt(toOffsetDateTime(p.getRequestedAt));
        api.setDescription(JsonNullable.of(p.getDescription));
        api.setLoanRequestId(p.getLoanRequestId.getContractId);
        api.setOfferContractId(p.getOfferContractId.getContractId);
        api.setCreditProfileId(p.getCreditProfileId.getContractId);
        api.setPrepareDeadlinePassed(!p.getPrepareUntil.isAfter(now));
        api.setSettleDeadlinePassed(!p.getSettleBefore.isAfter(now));
        c.allocationCid().ifPresent(cid -> api.setAllocationCid(JsonNullable.of(cid.getContractId)));
        return api;
    }

    private static LoanRepaymentRequestSummary toLoanRepaymentRequestApi(
            com.digitalasset.quickstart.pqs.Contract<LoanRepaymentRequest> c,
            Optional<ContractId<splice_api_token_allocation_v1.splice.api.token.allocationv1.Allocation>> allocationCid,
            Instant now) {
        var p = c.payload;
        var api = new LoanRepaymentRequestSummary();
        api.setContractId(c.contractId.getContractId);
        api.setRequestId(p.getRequestId);
        api.setLender(p.getLender.getParty);
        api.setBorrower(p.getBorrower.getParty);
        api.setRepaymentAmount(p.getRepaymentAmount);
        api.setPrepareUntil(toOffsetDateTime(p.getPrepareUntil));
        api.setSettleBefore(toOffsetDateTime(p.getSettleBefore));
        api.setRequestedAt(toOffsetDateTime(p.getRequestedAt));
        api.setDescription(JsonNullable.of(p.getDescription));
        api.setLoanContractId(p.getLoanContractIdText);
        api.setCreditProfileId(p.getCreditProfileId.getContractId);
        api.setPrepareDeadlinePassed(!p.getPrepareUntil.isAfter(now));
        api.setSettleDeadlinePassed(!p.getSettleBefore.isAfter(now));
        allocationCid.ifPresent(cid -> api.setAllocationCid(JsonNullable.of(cid.getContractId)));
        return api;
    }

    @Override
    @WithSpan
    @GetMapping("/loans")
    public CompletableFuture<ResponseEntity<List<org.openapitools.model.Loan>>> listLoans() {
        var ctx = tracingCtx(logger, "listLoans");
        return auth.asAuthenticatedParty(party -> {
            logger.info("[listLoans] party={}", party);
            return traceServiceCallAsync(ctx, () ->
                    damlRepository.findActiveLoansByParty(party)
                            .thenApply(contracts -> {
                                logger.debug("[listLoans] party={} returned {} loan(s)", party, contracts.size());
                                return ResponseEntity.ok(contracts.stream()
                                        .map(c -> toLoanApi(c))
                                        .toList());
                            }));
        });
    }

    private static org.openapitools.model.Loan toLoanApi(com.digitalasset.quickstart.pqs.Contract<Loan> c) {
        var p = c.payload;
        org.openapitools.model.Loan api = new org.openapitools.model.Loan();
        api.setContractId(c.contractId.getContractId);
        api.setLender(p.getLender.getParty);
        api.setBorrower(p.getBorrower.getParty);
        api.setPrincipal(p.getPrincipal);
        api.setInterestRate(p.getInterestRate);
        api.setDueDate(toOffsetDateTime(p.getDueDate));
        String statusStr = p.getStatus != null ? p.getStatus.toString() : "Active";
        try {
            api.setStatus(org.openapitools.model.Loan.StatusEnum.fromValue(statusStr));
        } catch (IllegalArgumentException e) {
            api.setStatus(org.openapitools.model.Loan.StatusEnum.ACTIVE);
        }
        return api;
    }

    private record TransferContext(ExtraArgs extraArgs, List<CommandsOuterClass.DisclosedContract> disclosedContracts) {
    }

    private TransferContext prepareTransferContext(
            List<DisclosedContract> disclosedContracts,
            Map<String, String> metaMap) {
        var disclosures = disclosedContracts
                .stream()
                .map(this::toLedgerApiDisclosedContract)
                .toList();
        Map<String, AnyValue> choiceContextMap = disclosures
                .stream()
                .map(dc -> {
                    var metaKey = metaMap.get(dc.getTemplateId().getEntityName());
                    if (metaKey != null) {
                        return Map.entry(metaKey, toAnyValueContractId(dc.getContractId()));
                    } else {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        return new TransferContext(
                new ExtraArgs(new ChoiceContext(choiceContextMap), toTokenStandardMetadata(Map.of())),
                disclosures
        );
    }

    private CommandsOuterClass.DisclosedContract toLedgerApiDisclosedContract(DisclosedContract dc) {
        ValueOuterClass.Identifier templateId = parseTemplateIdentifier(dc.getTemplateId());
        byte[] blob = java.util.Base64.getDecoder().decode(dc.getCreatedEventBlob());

        return CommandsOuterClass.DisclosedContract.newBuilder().setTemplateId(templateId).setContractId(dc.getContractId())
                .setCreatedEventBlob(ByteString.copyFrom(blob)).build();
    }

    private static ValueOuterClass.Identifier parseTemplateIdentifier(String templateIdStr) {
        String[] parts = templateIdStr.split(":");
        if (parts.length < 3) {
            throw new IllegalArgumentException("Invalid templateId format: " + templateIdStr);
        }
        String packageId = parts[0];
        String moduleName = parts[1];
        StringBuilder entityNameBuilder = new StringBuilder();
        for (int i = 2; i < parts.length; i++) {
            if (i > 2) {
                entityNameBuilder.append(":");
            }
            entityNameBuilder.append(parts[i]);
        }
        String entityName = entityNameBuilder.toString();

        return ValueOuterClass.Identifier.newBuilder().setPackageId(packageId).setModuleName(moduleName)
                .setEntityName(entityName).build();
    }

    private static AnyValue toAnyValueContractId(String contractId) {
        return new AnyValue.AnyValue_AV_ContractId(new ContractId<>(contractId));
    }

    private static splice_api_token_metadata_v1.splice.api.token.metadatav1.Metadata toTokenStandardMetadata(
            Map<String, String> meta) {
        return new splice_api_token_metadata_v1.splice.api.token.metadatav1.Metadata(meta);
    }
}
