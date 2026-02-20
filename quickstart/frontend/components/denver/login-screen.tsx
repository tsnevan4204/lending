"use client"

import { motion } from "motion/react"
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

export function LoginScreen({
  onLogin,
}: {
  onLogin: (role: "borrower" | "lender") => void
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
      {/* Top nav */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex items-center justify-between px-8 h-16 border-b border-border"
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="size-8 rounded-full bg-primary flex items-center justify-center"
          >
            <span className="text-primary-foreground font-bold text-sm">D</span>
          </motion.div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Denver Lending
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span className="text-sm text-muted-foreground">Canton Network</span>
        </div>
      </motion.header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-12 max-w-md w-full -mt-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center flex flex-col gap-3"
          >
            <h1 className="text-4xl font-bold tracking-tight text-foreground text-balance leading-tight">
              Decentralized lending, simplified.
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Borrow and lend with privacy-preserving smart contracts on the Canton Network.
            </p>
          </motion.div>

          <div className="flex flex-col gap-3 w-full">
            {[
              {
                role: "borrower" as const,
                icon: ArrowDownToLine,
                title: "Borrower",
                desc: "Request loans, review offers, manage repayments",
              },
              {
                role: "lender" as const,
                icon: ArrowUpFromLine,
                title: "Lender",
                desc: "Browse requests, provide liquidity, track returns",
              },
            ].map((item, i) => (
              <motion.button
                key={item.role}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ scale: 1.015, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onLogin(item.role)}
                className="flex items-center gap-4 w-full rounded-xl border border-border p-5 text-left transition-colors duration-200 hover:border-primary/40 hover:bg-primary/[0.03] group cursor-pointer"
              >
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, -5, 0] }}
                  transition={{ duration: 0.5 }}
                  className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors duration-200"
                >
                  <item.icon className="size-5 text-primary" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-xs text-muted-foreground"
          >
            All transactions are privacy-preserving via DAML smart contracts
          </motion.p>
        </div>
      </main>
    </div>
  )
}
