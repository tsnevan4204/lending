"use client"

import { useEffect, useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { ArrowUpDown, TrendingUp, TrendingDown, BarChart3, RefreshCw } from "lucide-react"
import type { ApiOrderBookResponse, ApiOrderBookTier } from "@/lib/api-types"
import { getOrderBook } from "@/lib/api"

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

function OrderBookHalf({
  tiers,
  side,
  maxAmount,
}: {
  tiers: ApiOrderBookTier[]
  side: "ask" | "bid"
  maxAmount: number
}) {
  const isAsk = side === "ask"

  return (
    <div className="flex flex-col">
      {tiers.map((tier, i) => {
        const barWidth = maxAmount > 0 ? (tier.totalAmount / maxAmount) * 100 : 0
        return (
          <div key={`${side}-${tier.interestRate}-${tier.duration}-${i}`} className="relative">
            <div
              className={cn(
                "absolute inset-y-0",
                isAsk ? "right-0 bg-destructive/[0.08]" : "right-0 bg-emerald-500/[0.08]"
              )}
              style={{ width: `${barWidth}%` }}
            />
            <div className="relative grid grid-cols-4 text-sm px-4 py-2.5 border-b border-border/40 last:border-0">
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  isAsk ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {tier.interestRate.toFixed(2)}%
              </span>
              <span className="text-right tabular-nums text-foreground font-medium">
                {formatCurrency(tier.totalAmount)}
              </span>
              <span className="text-right tabular-nums text-muted-foreground">
                {tier.duration}d
              </span>
              <span className="text-right tabular-nums text-muted-foreground">
                {tier.orderCount}
              </span>
            </div>
          </div>
        )
      })}
      {tiers.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No {isAsk ? "ask" : "bid"} orders
        </div>
      )}
    </div>
  )
}

export function OrderBook({
  orderBookData,
}: {
  orderBookData: ApiOrderBookResponse | null
}) {
  const [liveData, setLiveData] = useState<ApiOrderBookResponse | null>(orderBookData)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let cancelled = false
    let inflight = false
    const poll = async () => {
      if (inflight) return
      inflight = true
      try {
        const data = await getOrderBook()
        if (!cancelled && data) setLiveData(data)
      } catch {
        // swallow – next poll will retry
      } finally {
        inflight = false
      }
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // Also update when prop changes
  useEffect(() => {
    if (orderBookData) setLiveData(orderBookData)
  }, [orderBookData])

  const data = liveData

  const asks = useMemo(() => data?.asks ?? [], [data])
  const bids = useMemo(() => data?.bids ?? [], [data])

  // Sort asks ascending (lowest rate at bottom, closest to spread)
  const sortedAsks = useMemo(
    () => [...asks].sort((a, b) => b.interestRate - a.interestRate),
    [asks]
  )
  // Sort bids descending (highest rate at top, closest to spread)
  const sortedBids = useMemo(
    () => [...bids].sort((a, b) => b.interestRate - a.interestRate),
    [bids]
  )

  const maxAmount = useMemo(() => {
    const allAmounts = [...asks, ...bids].map((t) => t.totalAmount)
    return allAmounts.length > 0 ? Math.max(...allAmounts) : 1
  }, [asks, bids])

  const totalAskVolume = asks.reduce((sum, t) => sum + t.totalAmount, 0)
  const totalBidVolume = bids.reduce((sum, t) => sum + t.totalAmount, 0)
  const spread = data?.spread

  const handleRefresh = async () => {
    setRefreshing(true)
    const fresh = await getOrderBook()
    if (fresh) setLiveData(fresh)
    setRefreshing(false)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Order Book</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time aggregated order book depth
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-foreground/20"
        >
          <RefreshCw className={cn("size-3", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
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
                {asks.reduce((s, t) => s + t.orderCount, 0) +
                  bids.reduce((s, t) => s + t.orderCount, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Book Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Column Headers */}
        <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground px-4 py-2.5 bg-muted/30 border-b border-border">
          <span>Rate</span>
          <span className="text-right">Volume</span>
          <span className="text-right">Duration</span>
          <span className="text-right">Orders</span>
        </div>

        {/* Asks (top half) - red, sorted ascending from middle */}
        <div className="border-b-0">
          <div className="flex items-center gap-2 px-4 py-2 bg-destructive/[0.03] border-b border-border">
            <div className="size-2 rounded-full bg-destructive" />
            <span className="text-xs font-semibold text-destructive">
              Asks (Lenders)
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {asks.reduce((s, t) => s + t.orderCount, 0)} orders
            </span>
          </div>
          <OrderBookHalf tiers={sortedAsks} side="ask" maxAmount={maxAmount} />
        </div>

        {/* Spread (center) */}
        <div className="flex items-center justify-center py-3 bg-muted/50 border-y border-border">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="size-3.5 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground tabular-nums">
              Spread: {spread != null ? `${spread.toFixed(2)}%` : "—"}
            </span>
          </div>
        </div>

        {/* Bids (bottom half) - green, sorted descending from middle */}
        <div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/[0.03] border-b border-border">
            <div className="size-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Bids (Borrowers)
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {bids.reduce((s, t) => s + t.orderCount, 0)} orders
            </span>
          </div>
          <OrderBookHalf tiers={sortedBids} side="bid" maxAmount={maxAmount} />
        </div>
      </div>
    </div>
  )
}
