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
import type { ApiOrderBookResponse, ApiOrderBookTier } from "@/lib/api-types"

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount}`
}

interface BookEntry {
  rate: number
  totalAmount: number
  count: number
}

function toBookEntries(tiers: ApiOrderBookTier[]): BookEntry[] {
  return tiers.map((t) => ({ rate: t.interestRate, totalAmount: t.totalAmount, count: t.orderCount }))
}

function OrderBookSide({
  entries,
  side,
}: {
  entries: BookEntry[]
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
                isBid ? "bg-emerald-500/[0.06]" : "bg-destructive/[0.06]"
              )}
              style={{ width: `${barWidth}%` }}
            />
            <div className="relative grid grid-cols-3 text-sm px-3 py-2 border-b border-border/50 last:border-0">
              <span
                className={cn(
                  "font-medium tabular-nums",
                  isBid ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                )}
              >
                {entry.rate.toFixed(2)}%
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
  askEntries,
  bidEntries,
}: {
  askEntries: BookEntry[]
  bidEntries: BookEntry[]
}) {
  const chartData = useMemo(() => {
    const allRates = new Set<number>()
    askEntries.forEach((a) => allRates.add(a.rate))
    bidEntries.forEach((b) => allRates.add(b.rate))

    return Array.from(allRates)
      .sort((a, b) => a - b)
      .map((rate) => {
        const ask = askEntries.find((a) => a.rate === rate)
        const bid = bidEntries.find((b) => b.rate === rate)
        return {
          rate: `${rate}%`,
          asks: ask ? ask.totalAmount : 0,
          bids: bid ? bid.totalAmount : 0,
        }
      })
  }, [askEntries, bidEntries])

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
            name === "asks" ? "Asks (Lenders)" : "Bids (Borrowers)",
          ]}
        />
        <Bar dataKey="asks" radius={[4, 4, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={`ask-${index}`} fill="#ff5000" fillOpacity={0.7} />
          ))}
        </Bar>
        <Bar dataKey="bids" radius={[4, 4, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={`bid-${index}`} fill="#00C805" fillOpacity={0.7} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MarketDepth({
  orderBookData,
}: {
  orderBookData: ApiOrderBookResponse | null
}) {
  const asks = useMemo(() => orderBookData?.asks ?? [], [orderBookData])
  const bids = useMemo(() => orderBookData?.bids ?? [], [orderBookData])
  const askEntries = useMemo(() => toBookEntries(asks), [asks])
  const bidEntries = useMemo(() => toBookEntries(bids), [bids])

  const totalAskVolume = asks.reduce((sum, t) => sum + t.totalAmount, 0)
  const totalBidVolume = bids.reduce((sum, t) => sum + t.totalAmount, 0)
  const totalOrders = asks.reduce((s, t) => s + t.orderCount, 0) + bids.reduce((s, t) => s + t.orderCount, 0)
  const spread = orderBookData?.spread

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Market Depth</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Aggregated bids and asks by interest rate
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="size-4 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ask Volume</p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {formatCurrency(totalAskVolume)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bid Volume</p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {formatCurrency(totalBidVolume)}
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
                {spread != null ? `${spread.toFixed(2)}%` : "N/A"}
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
                {totalOrders}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-foreground">Liquidity by Rate</h3>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-destructive" />
              <span className="text-xs text-muted-foreground">Asks (Lenders)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Bids (Borrowers)</span>
            </div>
          </div>
        </div>
        <DepthChart askEntries={askEntries} bidEntries={bidEntries} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-2 rounded-full bg-destructive" />
            <h3 className="text-sm font-semibold text-foreground">Asks (Lenders)</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {asks.reduce((s, t) => s + t.orderCount, 0)} orders
            </span>
          </div>
          <OrderBookSide entries={askEntries} side="ask" />
        </div>

        <div className="rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-2 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">Bids (Borrowers)</h3>
            <span className="ml-auto text-xs text-muted-foreground">
              {bids.reduce((s, t) => s + t.orderCount, 0)} orders
            </span>
          </div>
          <OrderBookSide entries={bidEntries} side="bid" />
        </div>
      </div>
    </div>
  )
}
