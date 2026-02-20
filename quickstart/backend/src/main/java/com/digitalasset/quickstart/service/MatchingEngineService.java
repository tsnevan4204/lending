// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import com.digitalasset.quickstart.ledger.LedgerApi;
import com.digitalasset.quickstart.pqs.Contract;
import com.digitalasset.quickstart.repository.DamlRepository;
import com.digitalasset.quickstart.security.AuthUtils;
import com.digitalasset.transcode.java.ContractId;
import com.digitalasset.transcode.java.Party;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import quickstart_licensing.loan.orderbook.BorrowOrder;
import quickstart_licensing.loan.orderbook.LendOrder;
import quickstart_licensing.loan.orderbook.MatchedDeal;

/**
 * Off-chain matching engine that runs every 2 seconds.
 * Queries PQS for active BorrowOrder and LendOrder contracts,
 * matches compatible orders, and creates MatchedDeal contracts on-ledger.
 */
@Service
public class MatchingEngineService {

    private static final Logger logger = LoggerFactory.getLogger(MatchingEngineService.class);

    private final DamlRepository damlRepository;
    private final LedgerApi ledger;
    private final AuthUtils auth;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public MatchingEngineService(DamlRepository damlRepository, LedgerApi ledger, AuthUtils auth) {
        this.damlRepository = damlRepository;
        this.ledger = ledger;
        this.auth = auth;
    }

    @Scheduled(fixedDelay = 2000)
    public void scheduledMatch() {
        if (!running.compareAndSet(false, true)) {
            return;
        }
        try {
            runMatchingCycle();
        } catch (Exception e) {
            logger.warn("[MatchingEngineService] matching cycle failed", e);
        } finally {
            running.set(false);
        }
    }

    public int runMatchingCycle() {
        String platformParty = auth.getAppProviderPartyId();

        List<Contract<BorrowOrder>> borrows = new ArrayList<>(
                damlRepository.findActiveBorrowOrders().join());
        List<Contract<LendOrder>> lends = new ArrayList<>(
                damlRepository.findActiveLendOrders().join());

        if (borrows.isEmpty() || lends.isEmpty()) {
            return 0;
        }

        // Sort borrows by maxInterestRate descending (most willing to pay first)
        borrows.sort(Comparator.comparing(
                (Contract<BorrowOrder> c) -> c.payload.getMaxInterestRate).reversed());
        // Sort lends by minInterestRate ascending (cheapest supply first)
        lends.sort(Comparator.comparing(
                (Contract<LendOrder> c) -> c.payload.getMinInterestRate));

        int matchCount = 0;
        var usedBorrows = new HashSet<String>();
        var usedLends = new HashSet<String>();

        for (var borrow : borrows) {
            if (usedBorrows.contains(borrow.contractId.getContractId)) continue;
            for (var lend : lends) {
                if (usedLends.contains(lend.contractId.getContractId)) continue;

                // Match criteria: exact amount, exact duration, rate overlap
                if (borrow.payload.getAmount.compareTo(lend.payload.getAmount) != 0) continue;
                if (!borrow.payload.getDuration.equals(lend.payload.getDuration)) continue;
                if (borrow.payload.getMaxInterestRate.compareTo(lend.payload.getMinInterestRate) < 0) continue;

                // Calculate clearing rate (midpoint)
                BigDecimal clearingRate = borrow.payload.getMaxInterestRate
                        .add(lend.payload.getMinInterestRate)
                        .divide(BigDecimal.valueOf(2), 4, RoundingMode.HALF_UP);

                try {
                    // Archive both orders
                    ledger.exerciseAndGetResult(
                            borrow.contractId,
                            new BorrowOrder.BorrowOrder_MatchConsume(),
                            UUID.randomUUID().toString(),
                            platformParty
                    ).join();

                    ledger.exerciseAndGetResult(
                            lend.contractId,
                            new LendOrder.LendOrder_MatchConsume(),
                            UUID.randomUUID().toString(),
                            platformParty
                    ).join();

                    // Create MatchedDeal
                    Instant now = Instant.now();
                    MatchedDeal deal = new MatchedDeal(
                            new Party(borrow.payload.getBorrower.getParty),
                            new Party(lend.payload.getLender.getParty),
                            new Party(platformParty),
                            borrow.payload.getAmount,
                            clearingRate,
                            borrow.payload.getDuration,
                            borrow.payload.getCreditProfileId,
                            now,
                            false,
                            false
                    );
                    ledger.create(deal, UUID.randomUUID().toString(), platformParty).join();

                    matchCount++;
                    usedBorrows.add(borrow.contractId.getContractId);
                    usedLends.add(lend.contractId.getContractId);
                    logger.info("[MatchingEngineService] matched borrow={} lend={} rate={}",
                            borrow.contractId.getContractId,
                            lend.contractId.getContractId,
                            clearingRate);
                    break;
                } catch (Exception e) {
                    logger.warn("[MatchingEngineService] match failed borrow={} lend={}: {}",
                            borrow.contractId.getContractId,
                            lend.contractId.getContractId,
                            e.getMessage());
                }
            }
        }

        if (matchCount > 0) {
            logger.info("[MatchingEngineService] completed {} match(es)", matchCount);
        }
        return matchCount;
    }
}
