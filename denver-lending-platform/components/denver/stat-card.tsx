import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  iconColor = "text-primary",
  className,
}: {
  label: string
  value: string
  change?: string
  icon: LucideIcon
  iconColor?: string
  className?: string
}) {
  const isPositive = change?.startsWith("+")
  const isNegative = change?.startsWith("-")

  return (
    <div className={cn("rounded-xl border border-border p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {value}
          </span>
          {change && (
            <span
              className={cn(
                "text-xs",
                isPositive && "text-primary",
                isNegative && "text-destructive",
                !isPositive && !isNegative && "text-muted-foreground"
              )}
            >
              {change}
            </span>
          )}
        </div>
        <div
          className={cn(
            "size-9 rounded-full bg-secondary flex items-center justify-center",
            iconColor
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  )
}
