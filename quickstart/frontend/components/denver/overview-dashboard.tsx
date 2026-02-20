"use client"

import { motion } from "motion/react"
import { useTheme } from "next-themes"
import { StatCard } from "@/components/denver/stat-card"
import { cn } from "@/lib/utils"
import {
  DollarSign,
  Users,
  TrendingUp,
  Activity,
  ArrowUpFromLine,
  ArrowDownToLine,
  Shield,
  Lock,
  Eye,
  EyeOff,
  FileCheck,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { ActiveLoan } from "@/lib/mock-data"

const volumeData = [
  { month: "Sep", volume: 120000, loans: 18 },
  { month: "Oct", volume: 185000, loans: 24 },
  { month: "Nov", volume: 210000, loans: 31 },
  { month: "Dec", volume: 195000, loans: 28 },
  { month: "Jan", volume: 280000, loans: 42 },
  { month: "Feb", volume: 340000, loans: 56 },
]

function formatCurrency(amount: number) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount}`
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export function OverviewDashboard({
  stats,
  recentLoans,
}: {
  stats: {
    totalValueLocked: number
    totalLoansOriginated: number
    averageInterestRate: number
    activeLoans: number
    totalLenders: number
    totalBorrowers: number
  }
  recentLoans: ActiveLoan[]
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const gridColor = isDark ? "#2c2c2e" : "#e8e8e8"
  const tickColor = isDark ? "#8e8e93" : "#6f7177"
  const tooltipBg = isDark ? "#1c1c1c" : "#ffffff"
  const tooltipBorder = isDark ? "#2c2c2e" : "#e8e8e8"
  const tooltipText = isDark ? "#f5f5f5" : "#1b1b1b"

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-8"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Real-time platform metrics</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Value Locked" value={formatCurrency(stats.totalValueLocked)} change="+12.5% this month" icon={DollarSign} iconColor="text-primary" delay={0} />
        <StatCard label="Active Loans" value={stats.activeLoans.toString()} change="+8 this week" icon={Activity} iconColor="text-primary" delay={0.05} />
        <StatCard label="Avg. Interest Rate" value={`${stats.averageInterestRate}%`} change="-0.3% from last month" icon={TrendingUp} iconColor="text-muted-foreground" delay={0.1} />
        <StatCard label="Loans Originated" value={stats.totalLoansOriginated.toString()} change="+56 this month" icon={FileCheck} iconColor="text-primary" delay={0.15} />
        <StatCard label="Active Lenders" value={stats.totalLenders.toString()} change="+3 this week" icon={ArrowUpFromLine} iconColor="text-muted-foreground" delay={0.2} />
        <StatCard label="Active Borrowers" value={stats.totalBorrowers.toString()} change="+11 this week" icon={ArrowDownToLine} iconColor="text-muted-foreground" delay={0.25} />
      </motion.div>

      {/* Volume Chart */}
      <motion.div variants={fadeUp} className="rounded-xl border border-border p-6 transition-colors duration-300">
        <h3 className="text-sm font-semibold text-foreground mb-6">Monthly Loan Volume</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={volumeData}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00C805" stopOpacity={isDark ? 0.25 : 0.15} />
                <stop offset="100%" stopColor="#00C805" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: tickColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: tickColor }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: "8px",
                color: tooltipText,
                fontSize: "13px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              }}
              formatter={(value: number) => [formatCurrency(value), "Volume"]}
            />
            <Area type="monotone" dataKey="volume" stroke="#00C805" fill="url(#volumeGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Recent Activity + Privacy Info */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent */}
        <div className="rounded-xl border border-border p-6 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="flex flex-col gap-1">
            {recentLoans.map((loan, i) => (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08, duration: 0.3 }}
                whileHover={{ x: 4, backgroundColor: "var(--secondary)" }}
                className="flex items-center gap-3 text-sm rounded-lg px-3 py-2.5 -mx-3 cursor-default transition-colors duration-150"
              >
                <div
                  className={cn(
                    "size-2 rounded-full shrink-0",
                    loan.status === "active" && "bg-primary",
                    loan.status === "repaid" && "bg-muted-foreground",
                    loan.status === "defaulted" && "bg-destructive"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-foreground">{loan.purpose}</span>
                  <span className="text-muted-foreground">{" \u2014 "}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(loan.amount)}</span>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium capitalize shrink-0",
                    loan.status === "active" && "text-primary",
                    loan.status === "repaid" && "text-muted-foreground",
                    loan.status === "defaulted" && "text-destructive"
                  )}
                >
                  {loan.status}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(loan.fundedAt)}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="rounded-xl border border-border p-6 transition-colors duration-300">
          <h3 className="text-sm font-semibold text-foreground mb-4">Canton Privacy Model</h3>
          <div className="flex flex-col gap-3">
            {[
              { icon: Lock, label: "Loan Request", desc: "Visible only to borrower + platform until disclosed" },
              { icon: EyeOff, label: "Loan Offer", desc: "Private between specific lender and borrower" },
              { icon: Eye, label: "Active Loan", desc: "Visible only to lender and borrower (both signatories)" },
              { icon: Shield, label: "Credit Profile", desc: "Private to borrower only (sole signatory, no observers)" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08, duration: 0.3 }}
                whileHover={{ scale: 1.01, y: -1 }}
                className="flex items-start gap-3 rounded-lg bg-secondary p-3 transition-colors duration-200 cursor-default"
              >
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="size-4 text-primary" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  <span className="text-xs text-muted-foreground leading-relaxed">{item.desc}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
