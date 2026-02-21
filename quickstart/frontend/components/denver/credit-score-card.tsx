"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Shield, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { CreditProfile } from "@/lib/mock-data"

function getScoreColor(score: number) {
  if (score >= 750) return "text-primary"
  if (score >= 650) return "text-foreground"
  return "text-destructive"
}

function getScoreLabel(score: number) {
  if (score >= 750) return "Excellent"
  if (score >= 700) return "Good"
  if (score >= 650) return "Fair"
  return "Poor"
}

function getBarColor(score: number) {
  if (score >= 750) return "bg-primary"
  if (score >= 650) return "bg-foreground"
  return "bg-destructive"
}

export function CreditScoreCard({
  profile,
  isLoading,
  className,
}: {
  profile: CreditProfile
  isLoading?: boolean
  className?: string
}) {
  const percentage = ((profile.score - 300) / 550) * 100

  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-border p-5", className)}>
        <div className="flex items-center gap-2 mb-5">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-baseline gap-2 mb-4">
          <Skeleton className="h-10 w-20" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="mb-5">
          <Skeleton className="w-full h-1.5 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center rounded-lg bg-secondary py-3 px-1.5 gap-2">
              <Skeleton className="size-3.5 rounded" />
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("rounded-xl border border-border p-5", className)}>
      <div className="flex items-center gap-2 mb-5">
        <Shield className="size-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Credit Score</h3>
        <span className="ml-auto text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
          Private
        </span>
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className={cn("text-4xl font-bold tracking-tighter tabular-nums", getScoreColor(profile.score))}>
          {profile.score}
        </span>
        <div className="flex flex-col">
          <span className={cn("text-sm font-medium", getScoreColor(profile.score))}>
            {getScoreLabel(profile.score)}
          </span>
          <span className="text-[10px] text-muted-foreground">300 - 850</span>
        </div>
      </div>

      {/* Bar */}
      <div className="mb-5">
        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", getBarColor(profile.score))}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center rounded-lg bg-secondary py-3 px-1.5">
          <TrendingUp className="size-3.5 text-primary mb-1" />
          <span className="text-base font-bold text-foreground tabular-nums">
            {profile.successfulRepayments}
          </span>
          <span className="text-[10px] text-muted-foreground">Repaid</span>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-secondary py-3 px-1.5">
          <Minus className="size-3.5 text-muted-foreground mb-1" />
          <span className="text-base font-bold text-foreground tabular-nums">
            {profile.totalLoans}
          </span>
          <span className="text-[10px] text-muted-foreground">Total</span>
        </div>
        <div className="flex flex-col items-center rounded-lg bg-secondary py-3 px-1.5">
          <TrendingDown className="size-3.5 text-destructive mb-1" />
          <span className="text-base font-bold text-foreground tabular-nums">
            {profile.defaults}
          </span>
          <span className="text-[10px] text-muted-foreground">Defaults</span>
        </div>
      </div>
    </div>
  )
}
