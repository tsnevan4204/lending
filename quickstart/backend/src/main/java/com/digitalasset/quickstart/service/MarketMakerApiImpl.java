// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import static com.digitalasset.quickstart.service.ServiceUtils.ensurePresent;
import static com.digitalasset.quickstart.service.ServiceUtils.traceServiceCallAsync;
import static com.digitalasset.quickstart.utility.TracingUtils.tracingCtx;
import static com.digitalasset.quickstart.utility.Utils.toOffsetDateTime;

import com.digitalasset.quickstart.api.MarketApi;
import com.digitalasset.quickstart.ledger.LedgerApi;
import com.digitalasset.quickstart.repository.DamlRepository;
import com.digitalasset.quickstart.security.AuthUtils;
import com.digitalasset.transcode.java.ContractId;
import com.digitalasset.transcode.java.Party;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.openapitools.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import quickstart_licensing.loan.marketmaker.BorrowerAsk;
import quickstart_licensing.loan.marketmaker.LenderBid;
import quickstart_licensing.loan.marketmaker.MatchedLoanProposal;
import quickstart_licensing.loan.creditprofile.CreditProfile;

@RestController
@RequestMapping("${openapi.asset.base-path:}")
public class MarketMakerApiImpl implements MarketApi {

    private static final Logger logger = LoggerFactory.getLogger(MarketMakerApiImpl.class);

    private final LedgerApi ledger;
    private final DamlRepository damlRepository;
    private final AuthUtils auth;
    private final MarketMakerService marketMakerService;

    public MarketMakerApiImpl(LedgerApi ledger, DamlRepository damlRepository,
                              AuthUtils auth, MarketMakerService marketMakerService) {
        this.ledger = ledger;
        this.damlRepository = damlRepository;
        this.auth = auth;
        this.marketMakerService = marketMakerService;
    }

    @Override
    @WithSpan
    @GetMapping("/market/lender-bids")
    public CompletableFuture<ResponseEntity<List<LenderBidResponse>>> listLenderBids() {
        var ctx = tracingCtx(logger, "listLenderBids");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findActiveLenderBids().thenApply(bids -> {
                    List<LenderBidResponse> api = bids.stream()
                            .map(MarketMakerApiImpl::toLenderBidApi)
                            .toList();
                    return ResponseEntity.ok(api);
                })
        ));
    }

    @Override
    @WithSpan
    @PostMapping("/market/lender-bids")
    @ResponseBody
    public CompletableFuture<ResponseEntity<LenderBidResponse>> createLenderBid(
            String commandId, LenderBidCreate body) {
        var ctx = tracingCtx(logger, "createLenderBid");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () -> {
            Instant now = Instant.now();
            BigDecimal amount = body.getAmount() != null
                    ? BigDecimal.valueOf(body.getAmount()) : BigDecimal.ZERO;
            BigDecimal minRate = body.getMinInterestRate() != null
                    ? BigDecimal.valueOf(body.getMinInterestRate()) : BigDecimal.ZERO;
            int maxDuration = body.getMaxDuration() != null ? body.getMaxDuration() : 30;
            LenderBid template = new LenderBid(
                    new Party(party),
                    new Party(auth.getAppProviderPartyId()),
                    amount,
                    amount,
                    minRate,
                    (long) maxDuration,
                    now
            );
            return ledger.create(template,
                    commandId != null ? commandId : UUID.randomUUID().toString(), party)
                    .thenApply(v -> {
                        LenderBidResponse resp = new LenderBidResponse();
                        resp.setContractId("");
                        resp.setLender(party);
                        resp.setAmount(amount);
                        resp.setRemainingAmount(amount);
                        resp.setMinInterestRate(minRate);
                        resp.setMaxDuration(maxDuration);
                        resp.setCreatedAt(toOffsetDateTime(now));
                        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
                    });
        }));
    }

    @Override
    @WithSpan
    @DeleteMapping("/market/lender-bids/{contractId}")
    public CompletableFuture<ResponseEntity<Void>> cancelLenderBid(
            @PathVariable("contractId") String contractId, String commandId) {
        var ctx = tracingCtx(logger, "cancelLenderBid", "contractId", contractId);
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findLenderBidById(contractId).thenCompose(opt -> {
                    var bid = ensurePresent(opt, "LenderBid not found: %s", contractId);
                    var choice = new LenderBid.LenderBid_Cancel();
                    return ledger.exerciseAndGetResult(bid.contractId, choice,
                            commandId != null ? commandId : UUID.randomUUID().toString(), party)
                            .thenApply(v -> ResponseEntity.<Void>noContent().build());
                })
        ));
    }

    @Override
    @WithSpan
    @GetMapping("/market/borrower-asks")
    public CompletableFuture<ResponseEntity<List<BorrowerAskResponse>>> listBorrowerAsks() {
        var ctx = tracingCtx(logger, "listBorrowerAsks");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findActiveBorrowerAsks().thenApply(asks -> {
                    List<BorrowerAskResponse> api = asks.stream()
                            .map(MarketMakerApiImpl::toBorrowerAskApi)
                            .toList();
                    return ResponseEntity.ok(api);
                })
        ));
    }

    @Override
    @WithSpan
    @PostMapping("/market/borrower-asks")
    @ResponseBody
    public CompletableFuture<ResponseEntity<BorrowerAskResponse>> createBorrowerAsk(
            String commandId, BorrowerAskCreate body) {
        var ctx = tracingCtx(logger, "createBorrowerAsk");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () -> {
            Instant now = Instant.now();
            BigDecimal amount = body.getAmount() != null
                    ? BigDecimal.valueOf(body.getAmount()) : BigDecimal.ZERO;
            BigDecimal maxRate = body.getMaxInterestRate() != null
                    ? BigDecimal.valueOf(body.getMaxInterestRate()) : BigDecimal.ZERO;
            int duration = body.getDuration() != null ? body.getDuration() : 30;
            BorrowerAsk template = new BorrowerAsk(
                    new Party(party),
                    new Party(auth.getAppProviderPartyId()),
                    amount,
                    maxRate,
                    (long) duration,
                    new ContractId<>(body.getCreditProfileId()),
                    now
            );
            return ledger.create(template,
                    commandId != null ? commandId : UUID.randomUUID().toString(), party)
                    .thenApply(v -> {
                        BorrowerAskResponse resp = new BorrowerAskResponse();
                        resp.setContractId("");
                        resp.setBorrower(party);
                        resp.setAmount(amount);
                        resp.setMaxInterestRate(maxRate);
                        resp.setDuration(duration);
                        resp.setCreatedAt(toOffsetDateTime(now));
                        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
                    });
        }));
    }

    @Override
    @WithSpan
    @DeleteMapping("/market/borrower-asks/{contractId}")
    public CompletableFuture<ResponseEntity<Void>> cancelBorrowerAsk(
            @PathVariable("contractId") String contractId, String commandId) {
        var ctx = tracingCtx(logger, "cancelBorrowerAsk", "contractId", contractId);
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findBorrowerAskById(contractId).thenCompose(opt -> {
                    var ask = ensurePresent(opt, "BorrowerAsk not found: %s", contractId);
                    var choice = new BorrowerAsk.BorrowerAsk_Cancel();
                    return ledger.exerciseAndGetResult(ask.contractId, choice,
                            commandId != null ? commandId : UUID.randomUUID().toString(), party)
                            .thenApply(v -> ResponseEntity.<Void>noContent().build());
                })
        ));
    }

    @Override
    @WithSpan
    @PostMapping("/market/match")
    public CompletableFuture<ResponseEntity<MatchResult>> triggerMatch(String commandId) {
        var ctx = tracingCtx(logger, "triggerMatch");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () -> {
            int matches = marketMakerService.runMatchingCycle();
            MatchResult result = new MatchResult();
            result.setMatchesCreated(matches);
            result.setMessage("Matching cycle completed");
            return CompletableFuture.completedFuture(ResponseEntity.ok(result));
        }));
    }

    @Override
    @WithSpan
    @GetMapping("/market/matched-proposals")
    public CompletableFuture<ResponseEntity<List<MatchedProposalResponse>>> listMatchedProposals() {
        var ctx = tracingCtx(logger, "listMatchedProposals");
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findMatchedLoanProposals(party).thenApply(proposals -> {
                    List<MatchedProposalResponse> api = proposals.stream()
                            .map(MarketMakerApiImpl::toMatchedProposalResponse)
                            .toList();
                    return ResponseEntity.ok(api);
                })
        ));
    }

    @Override
    @WithSpan
    @PostMapping("/market/matched-proposals/{contractId}:accept")
    public CompletableFuture<ResponseEntity<AcceptMatchedProposal200Response>> acceptMatchedProposal(
            @PathVariable("contractId") String contractId,
            @RequestParam("commandId") String commandId) {
        var ctx = tracingCtx(logger, "acceptMatchedProposal", "contractId", contractId);
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findMatchedProposalById(contractId).thenCompose(opt -> {
                    var proposal = ensurePresent(opt, "MatchedLoanProposal not found: %s", contractId);
                    var choice = new MatchedLoanProposal.MatchedLoanProposal_Accept();
                    String lender = proposal.payload.getLender.getParty;
                    String borrower = proposal.payload.getBorrower.getParty;
                    return ledger.exerciseAndGetResultWithParties(proposal.contractId, choice,
                            commandId != null ? commandId : UUID.randomUUID().toString(),
                            List.of(lender, borrower))
                            .thenApply(loanCid -> {
                                var resp = new AcceptMatchedProposal200Response();
                                resp.setLoanId(loanCid.getContractId);
                                return ResponseEntity.ok(resp);
                            });
                })
        ));
    }

    @Override
    @WithSpan
    @PostMapping("/market/matched-proposals/{contractId}:reject")
    public CompletableFuture<ResponseEntity<Void>> rejectMatchedProposal(
            @PathVariable("contractId") String contractId,
            @RequestParam(value = "commandId", required = true) String commandId) {
        var ctx = tracingCtx(logger, "rejectMatchedProposal", "contractId", contractId);
        return auth.asAuthenticatedParty(party -> traceServiceCallAsync(ctx, () ->
                damlRepository.findMatchedProposalById(contractId).thenCompose(opt -> {
                    var proposal = ensurePresent(opt, "MatchedLoanProposal not found: %s", contractId);
                    var p = proposal.payload;
                    String lender = p.getLender.getParty;
                    String borrower = p.getBorrower.getParty;
                    if (party.equals(lender)) {
                        var choice = new MatchedLoanProposal.MatchedLoanProposal_Reject();
                        return ledger.exerciseAndGetResult(proposal.contractId, choice,
                                commandId != null ? commandId : UUID.randomUUID().toString(), party)
                                .thenApply(v -> ResponseEntity.<Void>noContent().build());
                    } else if (party.equals(borrower)) {
                        var choice = new MatchedLoanProposal.MatchedLoanProposal_Withdraw();
                        return ledger.exerciseAndGetResult(proposal.contractId, choice,
                                commandId != null ? commandId : UUID.randomUUID().toString(), party)
                                .thenApply(v -> ResponseEntity.<Void>noContent().build());
                    } else {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a party to this proposal");
                    }
                })
        ));
    }

    private static LenderBidResponse toLenderBidApi(
            com.digitalasset.quickstart.pqs.Contract<LenderBid> c) {
        var p = c.payload;
        LenderBidResponse api = new LenderBidResponse();
        api.setContractId(c.contractId.getContractId);
        api.setLender(p.getLender.getParty);
        api.setAmount(p.getAmount);
        api.setRemainingAmount(p.getRemainingAmount);
        api.setMinInterestRate(p.getMinInterestRate);
        api.setMaxDuration(p.getMaxDuration.intValue());
        api.setCreatedAt(toOffsetDateTime(p.getCreatedAt));
        return api;
    }

    private static BorrowerAskResponse toBorrowerAskApi(
            com.digitalasset.quickstart.pqs.Contract<BorrowerAsk> c) {
        var p = c.payload;
        BorrowerAskResponse api = new BorrowerAskResponse();
        api.setContractId(c.contractId.getContractId);
        api.setBorrower(p.getBorrower.getParty);
        api.setAmount(p.getAmount);
        api.setMaxInterestRate(p.getMaxInterestRate);
        api.setDuration(p.getDuration.intValue());
        api.setCreatedAt(toOffsetDateTime(p.getCreatedAt));
        return api;
    }

    private static MatchedProposalResponse toMatchedProposalResponse(
            com.digitalasset.quickstart.pqs.Contract<MatchedLoanProposal> c) {
        var p = c.payload;
        var api = new MatchedProposalResponse();
        api.setContractId(c.contractId.getContractId);
        api.setLender(p.getLender.getParty);
        api.setBorrower(p.getBorrower.getParty);
        api.setPrincipal(p.getPrincipal);
        api.setInterestRate(p.getInterestRate);
        api.setDurationDays(p.getDurationDays.intValue());
        api.setMatchedAt(toOffsetDateTime(p.getMatchedAt));
        return api;
    }

}
