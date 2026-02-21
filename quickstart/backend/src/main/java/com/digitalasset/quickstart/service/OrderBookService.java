// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import com.digitalasset.quickstart.repository.DamlRepository;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Aggregates active LenderBid and BorrowerAsk contracts into an order book view.
 * No private DAML party IDs are exposed in the output.
 */
@Service
public class OrderBookService {

    private static final Logger logger = LoggerFactory.getLogger(OrderBookService.class);

    private final DamlRepository damlRepository;

    public OrderBookService(DamlRepository damlRepository) {
        this.damlRepository = damlRepository;
    }

    public record Tier(BigDecimal interestRate, int duration, BigDecimal totalAmount, int orderCount) {}

    public record OrderBook(List<Tier> asks, List<Tier> bids, BigDecimal spread) {}

    /**
     * Build an aggregated order book from active MarketMaker orders.
     * Asks (LenderBids) are grouped by minInterestRate+maxDuration, sorted ascending by rate.
     * Bids (BorrowerAsks) are grouped by maxInterestRate+duration, sorted descending by rate.
     */
    public CompletableFuture<OrderBook> buildOrderBook() {
        var bidsFuture = damlRepository.findActiveLenderBids();
        var asksFuture = damlRepository.findActiveBorrowerAsks();

        return bidsFuture.thenCombine(asksFuture, (lenderBids, borrowerAsks) -> {
            logger.info("[OrderBook] building order book: lenderBids={} borrowerAsks={}", lenderBids.size(), borrowerAsks.size());
            if (borrowerAsks.isEmpty()) {
                logger.warn("[OrderBook] bids are empty (no BorrowerAsk contracts in PQS). " +
                        "If borrowers have placed asks, ensure BorrowerAsk is indexed: restart PQS (e.g. make restart-service SERVICE=pqs-app-provider).");
            } else {
                logger.info("[OrderBook] borrowerAsk sample: first contractId={}, amount={}, rate={}, duration={}",
                        borrowerAsks.get(0).contractId.getContractId,
                        borrowerAsks.get(0).payload.getAmount,
                        borrowerAsks.get(0).payload.getMaxInterestRate,
                        borrowerAsks.get(0).payload.getDuration);
            }
            // Aggregate asks (LenderBids = lenders offering supply) by rate+duration
            var askMap = new LinkedHashMap<String, Tier>();
            for (var c : lenderBids) {
                var p = c.payload;
                String key = p.getMinInterestRate.toPlainString() + ":" + p.getMaxDuration;
                askMap.merge(key,
                        new Tier(p.getMinInterestRate, p.getMaxDuration.intValue(), p.getRemainingAmount, 1),
                        (a, b) -> new Tier(a.interestRate, a.duration,
                                a.totalAmount.add(b.totalAmount), a.orderCount + b.orderCount));
            }
            List<Tier> asks = new ArrayList<>(askMap.values());
            asks.sort(Comparator.comparing(Tier::interestRate));

            // Aggregate bids (BorrowerAsks = borrowers requesting demand) by rate+duration
            var bidMap = new LinkedHashMap<String, Tier>();
            for (var c : borrowerAsks) {
                var p = c.payload;
                String key = p.getMaxInterestRate.toPlainString() + ":" + p.getDuration;
                bidMap.merge(key,
                        new Tier(p.getMaxInterestRate, p.getDuration.intValue(), p.getAmount, 1),
                        (a, b) -> new Tier(a.interestRate, a.duration,
                                a.totalAmount.add(b.totalAmount), a.orderCount + b.orderCount));
            }
            List<Tier> bids = new ArrayList<>(bidMap.values());
            bids.sort(Comparator.comparing(Tier::interestRate).reversed());

            // Calculate spread: lowest ask rate - highest bid rate
            BigDecimal spread = null;
            if (!asks.isEmpty() && !bids.isEmpty()) {
                BigDecimal lowestAsk = asks.get(0).interestRate;
                BigDecimal highestBid = bids.get(0).interestRate;
                spread = lowestAsk.subtract(highestBid);
            }

            return new OrderBook(asks, bids, spread);
        });
    }
}
