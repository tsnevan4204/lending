"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { BarChart3, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import type { LenderBid, BorrowerAsk, OrderBookEntry } from "@/lib/mock-data"
import { aggregateOrderBook } from "@/lib/mock-data"

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount}`
}

function OrderBookSide({
  entries,
  side,
}: {
  entries: OrderBookEntry[]
  side: "bid" | "ask"
}) {
  const maxAmount = Math.max(...entries.map((e) => e.totalAmount), 1)
  const isBid = side === "bid"

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground px-3 pb-2.5 border-b border-border">
        <span>Rate</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Orders</span>
      </div>
      {entries.map((entry) => {
        const barWidth = (entry.totalAmount / maxAmount) * 100
        return (
          <div key={`${side}-${entry.rate}`} className="relative">
            <div
              className={cn(
                "absolute inset-y-0 right-0 rounded-sm",
                isBid ? "bg-primary/[0.06]" : "bg-destructive/[0.06]"
              )}
              style={{ width: `${barWidth}%` }}
            />
            <div className="relative grid grid-cols-3 text-sm px-3 py-2 border-b border-border/50 last:border-0">
              <span
                className={cn(
                  "font-medium tabular-nums",
                  isBid ? "text-primary" : "text-destructive"
                )}
              >
                {entry.rate.toFixed(1)}%
              </span>
              <span className="text-right tabular-nums text-foreground">
                {formatCurrency(entry.totalAmount)}
              </span>
              <span className="text-right text-muted-foreground tabular-nums">
                {entry.count}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DepthChart({
  bidBook,
  askBook,
}: {
  bidBook: OrderBookEntry[]
  askBook: OrderBookEntry[]
}) {
  const chartData = useMemo(() => {
    const allRates = new Set<number>()
    bidBook.forEach((b) => allRates.add(b.rate))
    askBook.forEach((a) => allRates.add(a.rate))

    return Array.from(allRates)
      .sort((a, b) => a - b)
      .map((rate) => {
        const bid = bidBook.find((b) => b.rate === rate)
        const ask = askBook.find((a) => a.rate === rate)
        return {
          rate: `${rate}%`,
          bids: bid ? bid.totalAmount : 0,
          asks: ask ? ask.totalAmount : 0,
        }
      })
  }, [bidBook, askBook])

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" vertical={false} />
        <XAxis
          dataKey="rate"
          tick={{ fontSize: 12, fill: "#6f7177" }}
          axisLine={{ stroke: "#e8e8e8" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6f7177" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#ffffff",
            border: "1px solid #e8e8e8",
            borderRadius: "8px",
            color: "#1b1b1b",
            fontSize: "13px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name === "bids" ? "Lender Bids" : "Borrower Asks",
          ]}
        />
        <Bar dataKey="bids" radius={[4, 4, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={`bid-${index}`} fill="#00C805" fillOpacity={0.7} />
          ))}
        </Bar>
        <Bar dataKey="asks" radius={[4, 4, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={`ask-${index}`} fill="#ff5000" fillOpacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MarketDepth({
  bids,
  asks,
}: {
  bids: LenderBid[]
  asks: BorrowerAsk[]
}) {
  const { bidBook, askBook } = useMemo(
    () => aggregateOrderBook(bids, asks),
    [bids, asks]
  )

  const totalBidLiquidity = bids.reduce((sum, b) => sum + b.remainingAmount, 0)
  const totalAskDemand = asks.reduce((sum, a) => sum + a.amount, 0)

  const bestBid = bidBook.length > 0 ? Math.min(...bidBook.map((b) => b.rate)) : 0
  const bestAsk = askBook.length > 0 ? Math.max(...askBook.map((a) => a.rate)) : 0

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Order Book</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Aggregated bids and asks by interest rate
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bid Liquidity</p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {formatCurrency(totalBidLiquidity)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="size-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ask Demand</p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {formatCurrency(totalAskDemand)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-secondary flex items-center justify-center">
              <ArrowUpDown className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Spread</p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {bestAsk > 0 && bestBid > 0
                  ? `${(bestAsk - bestBid).toFixed(1)}%`
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-secondary flex items-center justify-center">
              <BarChart3 className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Orders</p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {bids.length + asks.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Depth Chart */}
      <div className="rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-foreground">Liquidity by Rate</h3>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Bids (Supply)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-destructive" />
              <span className="text-xs text-muted-foreground">Asks (Demand)</span>
            </div>
          </div>
        </div>
        <DepthChart bidBook={bidBook} askBook={askBook} />
      </div>

      {/* Order Book Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-2 rounded-full bg-primary" />
            <h3 className="text-sm font-semibold text-foreground">Lender Bids</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {bids.length} orders
            </span>
          </div>
          <OrderBookSide entries={bidBook} side="bid" />
        </div>

        <div className="rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-2 rounded-full bg-destructive" />
            <h3 className="text-sm font-semibold text-foreground">Borrower Asks</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {asks.length} orders
            </span>
          </div>
          <OrderBookSide entries={askBook} side="ask" />
        </div>
      </div>
    </div>
  )
}
