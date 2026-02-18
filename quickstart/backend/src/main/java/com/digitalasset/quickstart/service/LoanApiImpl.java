// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import static com.digitalasset.quickstart.service.ServiceUtils.ensurePresent;
import static com.digitalasset.quickstart.service.ServiceUtils.traceServiceCallAsync;
import static com.digitalasset.quickstart.utility.TracingUtils.tracingCtx;
import static com.digitalasset.quickstart.utility.Utils.toOffsetDateTime;

import com.digitalasset.quickstart.api.LoansApi;
import com.digitalasset.quickstart.ledger.LedgerApi;
import com.digitalasset.quickstart.repository.DamlRepository;
import com.digitalasset.quickstart.security.AuthUtils;
import com.digitalasset.transcode.java.ContractId;
import com.digitalasset.transcode.java.Party;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.openapitools.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import quickstart_licensing.loan.creditprofile.CreditProfile;
import quickstart_licensing.loan.loan.Loan;
import quickstart_licensing.loan.loanoffer.LoanOffer;
import quickstart_licensing.loan.loanrequest.LoanRequest;
import quickstart_licensing.loan.loanrequest.LoanRequestForLender;
import daml_prim_da_types.da.types.Tuple2;

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

    public LoanApiImpl(LedgerApi ledger, DamlRepository damlRepository, AuthUtils auth) {
        this.ledger = ledger;
        this.damlRepository = damlRepository;
        this.auth = auth;
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
                    return ledger.create(template, commandId != null ? commandId : UUID.randomUUID().toString(), party)
                            .thenApply(v -> {
                                logger.info("[createLoanRequest] SUCCESS party={} amount={} rate={} days={}", party, amount, rate, daysInt);
                                org.openapitools.model.LoanRequest body = new org.openapitools.model.LoanRequest();
                                body.setContractId("");
                                body.setBorrower(party);
                                body.setAmount(amount);
                                body.setInterestRate(rate);
                                body.setDurationDays(daysInt);
                                body.setPurpose(loanRequestCreate.getPurpose());
                                body.setCreatedAt(toOffsetDateTime(now));
                                return ResponseEntity.status(HttpStatus.CREATED).body(body);
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
                                        // Use the underlying LoanRequest contract id from the ForLender payload, not the wrapper's id.
                                        LoanOffer template = new LoanOffer(
                                                new Party(party),
                                                forLender.payload.getBorrower,
                                                forLender.payload.getRequestId,
                                                amount,
                                                rate,
                                                now);
                                        return ledger.create(template, commandId != null ? commandId : UUID.randomUUID().toString(), party)
                                                .thenApply(v -> {
                                                    logger.info("[createLoanOffer] created offer from LoanRequestForLender party={} requestId={} amount={} rate={}", party, loanOfferCreate.getLoanRequestId(), amount, rate);
                                                    org.openapitools.model.LoanOffer body = new org.openapitools.model.LoanOffer();
                                                    body.setContractId("");
                                                    body.setLender(party);
                                                    body.setBorrower(forLender.payload.getBorrower.getParty);
                                                    body.setAmount(amount);
                                                    body.setInterestRate(rate);
                                                    body.setCreatedAt(toOffsetDateTime(now));
                                                    return ResponseEntity.status(HttpStatus.CREATED).body(body);
                                                });
                                    }
                                    // Fallback: client may have sent LoanRequest id (e.g. from borrower flow or resolved id).
                                    return damlRepository.findLoanRequestById(loanOfferCreate.getLoanRequestId())
                                            .thenCompose(optReq -> {
                                                if (optReq.isPresent()) {
                                                    return CompletableFuture.completedFuture(optReq);
                                                }
                                                logger.warn("[createLoanOffer] LoanRequest not found for id={}, trying single-platform-request fallback", loanOfferCreate.getLoanRequestId());
                                                return damlRepository.findActiveLoanRequestsByPlatform(appProviderPartyId)
                                                        .thenApply(platformList -> {
                                                            if (platformList.size() == 1) {
                                                                logger.info("[createLoanOffer] using single platform request as fallback");
                                                                return Optional.of(platformList.get(0));
                                                            }
                                                            return Optional.<com.digitalasset.quickstart.pqs.Contract<LoanRequest>>empty();
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
                                                LoanOffer template = new LoanOffer(
                                                        new Party(party),
                                                        req.payload.getBorrower,
                                                        req.contractId,
                                                        amount,
                                                        rate,
                                                        now);
                                                return ledger.create(template, commandId != null ? commandId : UUID.randomUUID().toString(), party)
                                                        .thenApply(v -> {
                                                            logger.info("[createLoanOffer] created offer from LoanRequest party={} requestId={} amount={} rate={}", party, loanOfferCreate.getLoanRequestId(), amount, rate);
                                                            org.openapitools.model.LoanOffer body = new org.openapitools.model.LoanOffer();
                                                            body.setContractId("");
                                                            body.setLender(party);
                                                            body.setBorrower(req.payload.getBorrower.getParty);
                                                            body.setAmount(amount);
                                                            body.setInterestRate(rate);
                                                            body.setCreatedAt(toOffsetDateTime(now));
                                                            return ResponseEntity.status(HttpStatus.CREATED).body(body);
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
        api.setCreatedAt(toOffsetDateTime(p.getCreatedAt));
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
}
