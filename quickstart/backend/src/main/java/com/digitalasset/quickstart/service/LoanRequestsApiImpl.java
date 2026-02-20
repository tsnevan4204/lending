// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import static com.digitalasset.quickstart.service.ServiceUtils.traceServiceCallAsync;
import static com.digitalasset.quickstart.utility.TracingUtils.tracingCtx;
import static com.digitalasset.quickstart.utility.Utils.toOffsetDateTime;

import com.digitalasset.quickstart.api.LoanRequestsApi;
import com.digitalasset.quickstart.ledger.LedgerApi;
import com.digitalasset.quickstart.repository.DamlRepository;
import com.digitalasset.quickstart.security.AuthUtils;
import com.digitalasset.transcode.java.Party;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import org.openapitools.model.LoanRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import com.digitalasset.quickstart.pqs.Contract;
import quickstart_licensing.loan.loanrequest.LoanRequestForLender;

/**
 * Loan requests API. Borrowers see their own requests; lenders see requests disclosed to them
 * (marketplace). Platform discloses requests to lenders on first list so lenders can find borrowers.
 */
@Controller
@RequestMapping("${openapi.asset.base-path:}")
public class LoanRequestsApiImpl implements LoanRequestsApi {

    private static final Logger logger = LoggerFactory.getLogger(LoanRequestsApiImpl.class);

    private final LedgerApi ledger;
    private final DamlRepository damlRepository;
    private final AuthUtils auth;

    public LoanRequestsApiImpl(LedgerApi ledger, DamlRepository damlRepository, AuthUtils auth) {
        this.ledger = ledger;
        this.damlRepository = damlRepository;
        this.auth = auth;
    }

    @Override
    @WithSpan
    @GetMapping("/loan-requests")
    public CompletableFuture<ResponseEntity<List<LoanRequest>>> listLoanRequests() {
        logger.debug("[listLoanRequests] request received");
        var ctx = tracingCtx(logger, "listLoanRequests");
        String appProviderPartyId = auth.getAppProviderPartyId();
        return auth.asAuthenticatedParty(party -> {
            logger.info("[listLoanRequests] party={} appProviderPartyId={}", party, appProviderPartyId);
            return traceServiceCallAsync(ctx, () ->
                    damlRepository.findActiveLoanRequestsByBorrower(party)
                            .thenCompose(borrowerRequests -> {
                                List<LoanRequest> result = new ArrayList<>(
                                        borrowerRequests.stream()
                                                .map(LoanRequestsApiImpl::toLoanRequestApi)
                                                .toList());
                                Set<String> seenIds = new HashSet<>(
                                        borrowerRequests.stream()
                                                .map(c -> c.contractId.getContractId)
                                                .collect(Collectors.toSet()));
                                // If not platform, ensure we disclose platform requests to this party (lender marketplace)
                                if (!party.equals(appProviderPartyId)) {
                                    return damlRepository.findActiveLoanRequestsByPlatform(appProviderPartyId)
                                            .thenCompose(platformRequests ->
                                                    damlRepository.findActiveLoanRequestForLenderByLender(party)
                                                            .thenCompose(alreadyDisclosed -> {
                                                                // Already-disclosed may use different id format; match by (borrower,amount,duration,purpose)
                                                                Set<String> disclosedKeys = alreadyDisclosed.stream()
                                                                        .map(d -> d.payload.getBorrower.getParty + "|" + d.payload.getAmount + "|" + (d.payload.getDurationDays != null ? d.payload.getDurationDays.longValue() : "") + "|" + (d.payload.getPurpose != null ? d.payload.getPurpose : ""))
                                                                        .collect(Collectors.toSet());
                                                                List<CompletableFuture<?>> discloseFutures = new ArrayList<>();
                                                                for (var req : platformRequests) {
                                                                    String key = req.payload.getBorrower.getParty + "|" + req.payload.getAmount + "|" + (req.payload.getDurationDays != null ? req.payload.getDurationDays.longValue() : "") + "|" + (req.payload.getPurpose != null ? req.payload.getPurpose : "");
                                                                    if (!disclosedKeys.contains(key)) {
                                                                        // Skip disclosing a request to the borrower who created it
                                                                        if (req.payload.getBorrower.getParty.equals(party)) {
                                                                            continue;
                                                                        }
                                                                        var choice = new quickstart_licensing.loan.loanrequest.LoanRequest
                                                                                .LoanRequest_DiscloseToLender(new Party(party));
                                                                        discloseFutures.add(
                                                                                ledger.exerciseAndGetResult(
                                                                                        req.contractId,
                                                                                        choice,
                                                                                        UUID.randomUUID().toString(),
                                                                                        appProviderPartyId)
                                                                                        .exceptionally(ex -> {
                                                                                            logger.warn("[listLoanRequests] failed to disclose request={} to party={}: {}",
                                                                                                    req.contractId.getContractId, party, ex.getMessage());
                                                                                            return null;
                                                                                        }));
                                                                    }
                                                                }
                                                                return CompletableFuture.allOf(discloseFutures.toArray(CompletableFuture[]::new))
                                                                        .thenCompose(v -> damlRepository.findActiveLoanRequestForLenderByLender(party));
                                                            }))
                                            .thenCompose(disclosedToMe -> {
                                                // Use LoanRequestForLender contract id per row so "Make offer" can look it up.
                                                for (var c : disclosedToMe) {
                                                    if (!seenIds.add(c.contractId.getContractId)) continue;
                                                    result.add(toLoanRequestApiFromForLender(c));
                                                }
                                                logger.info("[listLoanRequests] party={} returning {} request(s) (borrower + disclosed)", party, result.size());
                                                return CompletableFuture.completedFuture(ResponseEntity.ok(result));
                                            });
                                }
                                // Platform party acts as lender too: return ALL active requests it observes as platformOperator.
                                return damlRepository.findActiveLoanRequestsByPlatform(appProviderPartyId)
                                        .thenApply(platformRequests -> {
                                            for (var req : platformRequests) {
                                                if (seenIds.add(req.contractId.getContractId)) {
                                                    result.add(toLoanRequestApi(req));
                                                }
                                            }
                                            logger.info("[listLoanRequests] party={} (platform/lender) returning {} request(s)", party, result.size());
                                            return ResponseEntity.ok(result);
                                        });
                            }));
        });
    }

    private static LoanRequest toLoanRequestApi(
            com.digitalasset.quickstart.pqs.Contract<quickstart_licensing.loan.loanrequest.LoanRequest> c) {
        var p = c.payload;
        LoanRequest api = new LoanRequest();
        api.setContractId(c.contractId.getContractId);
        api.setBorrower(p.getBorrower.getParty);
        api.setAmount(p.getAmount);
        api.setInterestRate(p.getInterestRate);
        api.setDurationDays(p.getDurationDays != null ? p.getDurationDays.intValue() : 0);
        api.setPurpose(p.getPurpose != null ? p.getPurpose : "");
        api.setCreatedAt(toOffsetDateTime(p.getCreatedAt));
        return api;
    }

    private static LoanRequest toLoanRequestApiFromForLender(
            com.digitalasset.quickstart.pqs.Contract<LoanRequestForLender> c) {
        var p = c.payload;
        LoanRequest api = new LoanRequest();
        // Use LoanRequestForLender contract id so "Make offer" can look it up (lender does not see LoanRequest).
        api.setContractId(c.contractId.getContractId);
        api.setUnderlyingRequestContractId(p.getRequestId.getContractId);
        api.setBorrower(p.getBorrower.getParty);
        api.setAmount(p.getAmount);
        api.setInterestRate(p.getInterestRate);
        api.setDurationDays(p.getDurationDays != null ? p.getDurationDays.intValue() : 0);
        api.setPurpose(p.getPurpose != null ? p.getPurpose : "");
        api.setCreatedAt(toOffsetDateTime(p.getCreatedAt));
        return api;
    }
}
