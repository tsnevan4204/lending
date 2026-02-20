// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import com.digitalasset.quickstart.pqs.Contract;
import com.digitalasset.quickstart.repository.DamlRepository;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import quickstart_licensing.loan.orderbook.BorrowOrder;
import quickstart_licensing.loan.orderbook.LendOrder;

/**
 * Aggregates active BorrowOrder and LendOrder contracts into an order book.
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
     * Build an aggregated order book from active orders.
     * Asks (LendOrders) are grouped by minInterestRate+duration, sorted ascending by rate.
     * Bids (BorrowOrders) are grouped by maxInterestRate+duration, sorted descending by rate.
     */
    public CompletableFuture<OrderBook> buildOrderBook() {
        var lendsFuture = damlRepository.findActiveLendOrders();
        var borrowsFuture = damlRepository.findActiveBorrowOrders();

        return lendsFuture.thenCombine(borrowsFuture, (lends, borrows) -> {
            // Aggregate asks (LendOrders) by rate+duration
            var askMap = new LinkedHashMap<String, Tier>();
            for (var c : lends) {
                var p = c.payload;
                String key = p.getMinInterestRate.toPlainString() + ":" + p.getDuration;
                askMap.merge(key,
                        new Tier(p.getMinInterestRate, p.getDuration.intValue(), p.getAmount, 1),
                        (a, b) -> new Tier(a.interestRate, a.duration,
                                a.totalAmount.add(b.totalAmount), a.orderCount + b.orderCount));
            }
            List<Tier> asks = new ArrayList<>(askMap.values());
            asks.sort(Comparator.comparing(Tier::interestRate));

            // Aggregate bids (BorrowOrders) by rate+duration
            var bidMap = new LinkedHashMap<String, Tier>();
            for (var c : borrows) {
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
