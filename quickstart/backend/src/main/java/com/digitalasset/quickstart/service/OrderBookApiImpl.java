// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.service;

import static com.digitalasset.quickstart.service.ServiceUtils.traceServiceCallAsync;
import static com.digitalasset.quickstart.utility.TracingUtils.tracingCtx;

import com.digitalasset.quickstart.api.OrderbookApi;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import java.util.concurrent.CompletableFuture;
import org.openapitools.jackson.nullable.JsonNullable;
import org.openapitools.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST endpoint for the aggregated order book.
 * GET /orderbook is public (no auth) and exposes no private DAML party IDs.
 */
@RestController
@RequestMapping("${openapi.asset.base-path:}")
public class OrderBookApiImpl implements OrderbookApi {

    private static final Logger logger = LoggerFactory.getLogger(OrderBookApiImpl.class);

    private final OrderBookService orderBookService;

    public OrderBookApiImpl(OrderBookService orderBookService) {
        this.orderBookService = orderBookService;
    }

    @Override
    @WithSpan
    public CompletableFuture<ResponseEntity<OrderBookResponse>> getOrderBook() {
        var ctx = tracingCtx(logger, "getOrderBook");
        return traceServiceCallAsync(ctx, () ->
                orderBookService.buildOrderBook().thenApply(ob -> {
                    logger.debug("[getOrderBook] returning asks={} bids={}", ob.asks().size(), ob.bids().size());
                    OrderBookResponse resp = new OrderBookResponse();
                    resp.setAsks(ob.asks().stream().map(t -> {
                        OrderBookTier tier = new OrderBookTier();
                        tier.setInterestRate(t.interestRate());
                        tier.setDuration(t.duration());
                        tier.setTotalAmount(t.totalAmount());
                        tier.setOrderCount(t.orderCount());
                        return tier;
                    }).toList());
                    resp.setBids(ob.bids().stream().map(t -> {
                        OrderBookTier tier = new OrderBookTier();
                        tier.setInterestRate(t.interestRate());
                        tier.setDuration(t.duration());
                        tier.setTotalAmount(t.totalAmount());
                        tier.setOrderCount(t.orderCount());
                        return tier;
                    }).toList());
                    resp.setSpread(ob.spread() != null
                            ? JsonNullable.of(ob.spread())
                            : JsonNullable.<java.math.BigDecimal>undefined());
                    return ResponseEntity.ok(resp);
                })
        );
    }
}
