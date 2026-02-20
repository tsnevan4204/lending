// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import static com.digitalasset.quickstart.service.ServiceUtils.traceServiceCallAsync;
import static com.digitalasset.quickstart.utility.TracingUtils.tracingCtx;
import static com.digitalasset.quickstart.utility.Utils.toOffsetDateTime;

import com.digitalasset.quickstart.api.CreditProfileApi;
import com.digitalasset.quickstart.ledger.LedgerApi;
import com.digitalasset.quickstart.repository.DamlRepository;
import com.digitalasset.quickstart.security.AuthUtils;
import com.digitalasset.transcode.java.Party;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.openapitools.model.CreditProfile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Credit profile API. Privacy: only the borrower (authenticated party) can see their profile.
 */
@Controller
@RequestMapping("${openapi.asset.base-path:}")
public class CreditProfileApiImpl implements CreditProfileApi {

    private static final Logger logger = LoggerFactory.getLogger(CreditProfileApiImpl.class);

    private final LedgerApi ledger;
    private final DamlRepository damlRepository;
    private final AuthUtils auth;

    public CreditProfileApiImpl(LedgerApi ledger, DamlRepository damlRepository, AuthUtils auth) {
        this.ledger = ledger;
        this.damlRepository = damlRepository;
        this.auth = auth;
    }

    @Override
    @WithSpan
    public CompletableFuture<ResponseEntity<CreditProfile>> getCreditProfile() {
        var ctx = tracingCtx(logger, "getCreditProfile");
        logger.debug("[getCreditProfile] entry");
        return auth.asAuthenticatedParty(party -> {
            logger.info("[getCreditProfile] authenticated party={}", party);
            CompletableFuture<ResponseEntity<CreditProfile>> future =
                    traceServiceCallAsync(ctx, () ->
                            damlRepository.findActiveCreditProfilesByBorrower(party)
                                    .thenCompose(list -> {
                                        logger.debug("[getCreditProfile] PQS findActiveCreditProfilesByBorrower(party={}) returned {} profile(s)", party, list.size());
                                        if (list.isEmpty()) {
                                            logger.info("[getCreditProfile] no profile for party={}, creating initial CreditProfile on ledger", party);
                                            Instant now = Instant.now();
                                            quickstart_licensing.loan.creditprofile.CreditProfile template =
                                                    new quickstart_licensing.loan.creditprofile.CreditProfile(
                                                    new Party(party),
                                                    600L,
                                                    0L,
                                                    0L,
                                                    0L,
                                                    now);
                                            return ledger.create(template,
                                                            UUID.randomUUID().toString(),
                                                            party)
                                                    .thenCompose(v -> {
                                                        logger.debug("[getCreditProfile] ledger create succeeded, waiting for PQS indexing then re-querying");
                                                        // PQS may not have indexed the new contract yet; retry up to 3 times with backoff.
                                                        return retryQueryWithBackoff(party, 3, 500);
                                                    })
                                                    .thenApply(newList -> {
                                                        if (newList.isEmpty()) {
                                                            logger.warn("[getCreditProfile] re-query after create returned empty after retries");
                                                            return ResponseEntity.status(HttpStatus.NOT_FOUND).body((CreditProfile) null);
                                                        }
                                                        return toCreditProfileResponse(newList.get(0));
                                                    })
                                                    .exceptionally(ex -> {
                                                        logger.error("[getCreditProfile] failed to create or fetch profile: party={}", party, ex);
                                                        throw ex instanceof RuntimeException ? (RuntimeException) ex : new RuntimeException(ex);
                                                    });
                                        }
                                        return CompletableFuture.completedFuture(toCreditProfileResponse(list.get(0)));
                                    }));
            return future;
        });
    }

    private CompletableFuture<java.util.List<com.digitalasset.quickstart.pqs.Contract<quickstart_licensing.loan.creditprofile.CreditProfile>>>
            retryQueryWithBackoff(String party, int attemptsLeft, long delayMs) {
        return CompletableFuture.supplyAsync(() -> null, CompletableFuture.delayedExecutor(delayMs, TimeUnit.MILLISECONDS))
                .thenCompose(ignored -> damlRepository.findActiveCreditProfilesByBorrower(party))
                .thenCompose(list -> {
                    if (!list.isEmpty() || attemptsLeft <= 1) {
                        logger.debug("[getCreditProfile] PQS re-query returned {} result(s) (attempts remaining: {})", list.size(), attemptsLeft - 1);
                        return CompletableFuture.completedFuture(list);
                    }
                    logger.debug("[getCreditProfile] PQS still empty, retrying in {}ms ({} attempts left)", delayMs * 2, attemptsLeft - 1);
                    return retryQueryWithBackoff(party, attemptsLeft - 1, delayMs * 2);
                });
    }

    private static ResponseEntity<CreditProfile> toCreditProfileResponse(
            com.digitalasset.quickstart.pqs.Contract<quickstart_licensing.loan.creditprofile.CreditProfile> c) {
        CreditProfile body = new CreditProfile();
        body.setContractId(c.contractId.getContractId);
        body.setBorrower(c.payload.getBorrower.getParty);
        body.setCreditScore(c.payload.getCreditScore.intValue());
        body.setTotalLoans(c.payload.getTotalLoans.intValue());
        body.setSuccessfulLoans(c.payload.getSuccessfulLoans.intValue());
        body.setDefaultedLoans(c.payload.getDefaultedLoans.intValue());
        body.setCreatedAt(toOffsetDateTime(c.payload.getCreatedAt));
        return ResponseEntity.ok(body);
    }
}
