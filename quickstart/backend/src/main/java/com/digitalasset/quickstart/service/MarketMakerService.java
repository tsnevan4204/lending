// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import com.digitalasset.quickstart.ledger.LedgerApi;
import com.digitalasset.quickstart.pqs.Contract;
import com.digitalasset.quickstart.repository.DamlRepository;
import com.digitalasset.quickstart.security.AuthUtils;
import com.digitalasset.transcode.java.Party;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import quickstart_licensing.loan.marketmaker.BorrowerAsk;
import quickstart_licensing.loan.marketmaker.LenderBid;
import quickstart_licensing.loan.marketmaker.MatchingEngine;

@Service
public class MarketMakerService {

    private static final Logger logger = LoggerFactory.getLogger(MarketMakerService.class);

    private final DamlRepository damlRepository;
    private final LedgerApi ledger;
    private final AuthUtils auth;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final AtomicBoolean engineBootstrapped = new AtomicBoolean(false);

    public MarketMakerService(DamlRepository damlRepository, LedgerApi ledger, AuthUtils auth) {
        this.damlRepository = damlRepository;
        this.ledger = ledger;
        this.auth = auth;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void bootstrapMatchingEngine() {
        String platformParty = auth.getAppProviderPartyId();
        try {
            var existing = damlRepository.findMatchingEngine(platformParty).join();
            if (existing.isPresent()) {
                logger.info("[MarketMakerService] MatchingEngine already exists for platform={}", platformParty);
                engineBootstrapped.set(true);
                return;
            }
            logger.info("[MarketMakerService] Creating MatchingEngine contract for platform={}", platformParty);
            MatchingEngine template = new MatchingEngine(new Party(platformParty));
            ledger.create(template, "bootstrap-matching-engine-" + UUID.randomUUID(), platformParty).join();
            engineBootstrapped.set(true);
            logger.info("[MarketMakerService] MatchingEngine contract created successfully");
        } catch (Exception e) {
            logger.warn("[MarketMakerService] Failed to bootstrap MatchingEngine (will retry on next matching cycle)", e);
        }
    }

    private void ensureMatchingEngine(String platformParty) {
        if (engineBootstrapped.get()) return;
        try {
            var existing = damlRepository.findMatchingEngine(platformParty).join();
            if (existing.isPresent()) {
                engineBootstrapped.set(true);
                return;
            }
            MatchingEngine template = new MatchingEngine(new Party(platformParty));
            ledger.create(template, "bootstrap-matching-engine-" + UUID.randomUUID(), platformParty).join();
            engineBootstrapped.set(true);
            logger.info("[MarketMakerService] MatchingEngine contract created (lazy bootstrap)");
        } catch (Exception e) {
            logger.debug("[MarketMakerService] MatchingEngine bootstrap retry failed: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelay = 5000)
    public void scheduledMatch() {
        if (!running.compareAndSet(false, true)) {
            return;
        }
        try {
            runMatchingCycle();
        } catch (Exception e) {
            logger.warn("[MarketMakerService] matching cycle failed", e);
        } finally {
            running.set(false);
        }
    }

    public int runMatchingCycle() {
        String platformParty = auth.getAppProviderPartyId();

        ensureMatchingEngine(platformParty);

        var engineOpt = damlRepository.findMatchingEngine(platformParty).join();
        if (engineOpt.isEmpty()) {
            logger.debug("[MarketMakerService] no MatchingEngine contract found for platform={}", platformParty);
            return 0;
        }
        var engineContract = engineOpt.get();

        List<Contract<LenderBid>> bids = new ArrayList<>(
                damlRepository.findActiveLenderBids().join());
        List<Contract<BorrowerAsk>> asks = new ArrayList<>(
                damlRepository.findActiveBorrowerAsks().join());

        bids.sort(Comparator.comparing(c -> c.payload.getMinInterestRate));
        asks.sort(Comparator.comparing((Contract<BorrowerAsk> c) -> c.payload.getMaxInterestRate).reversed());

        int matchCount = 0;
        var usedBids = new java.util.HashSet<String>();
        var usedAsks = new java.util.HashSet<String>();

        for (var bid : bids) {
            if (usedBids.contains(bid.contractId.getContractId)) continue;
            for (var ask : asks) {
                if (usedAsks.contains(ask.contractId.getContractId)) continue;
                if (bid.payload.getMinInterestRate.compareTo(ask.payload.getMaxInterestRate) > 0) continue;
                if (ask.payload.getDuration > bid.payload.getMaxDuration) continue;

                try {
                    var choice = new MatchingEngine.MatchOrders(bid.contractId, ask.contractId);
                    ledger.exerciseAndGetResult(
                            engineContract.contractId,
                            choice,
                            UUID.randomUUID().toString(),
                            platformParty
                    ).join();
                    matchCount++;
                    usedAsks.add(ask.contractId.getContractId);
                    usedBids.add(bid.contractId.getContractId);
                    logger.info("[MarketMakerService] matched bid={} ask={}", bid.contractId.getContractId, ask.contractId.getContractId);
                    break;
                } catch (Exception e) {
                    logger.warn("[MarketMakerService] match failed bid={} ask={}: {}",
                            bid.contractId.getContractId, ask.contractId.getContractId, e.getMessage());
                }
            }
        }

        if (matchCount > 0) {
            logger.info("[MarketMakerService] completed {} match(es)", matchCount);
        }
        return matchCount;
    }
}
