"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { AppSidebar } from "@/components/denver/app-sidebar"
import { LoginScreen } from "@/components/denver/login-screen"
import { OverviewDashboard } from "@/components/denver/overview-dashboard"
import { BorrowerDashboard } from "@/components/denver/borrower-dashboard"
import { LenderDashboard } from "@/components/denver/lender-dashboard"
import { MarketDepth } from "@/components/denver/market-depth"
import { CreditScoreCard } from "@/components/denver/credit-score-card"
import { PrivacyView } from "@/components/denver/privacy-view"
import { useDenverData } from "@/hooks/use-denver-data"

export default function DenverLendingApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [role, setRole] = useState<"borrower" | "lender">("borrower")
  const [activeView, setActiveView] = useState("overview")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const {
    requests,
    offers,
    loans,
    creditProfile,
    bids,
    asks,
    platformStats,
    loading,
    error,
    useApi,
    createLoanRequest,
    createLoanOffer,
    fundLoan,
    repayLoan,
    markLoanDefault,
    createLenderBid,
    cancelLenderBid,
  } = useDenverData(role)

  function handleLogin(selectedRole: "borrower" | "lender") {
    setRole(selectedRole)
    setIsLoggedIn(true)
    setActiveView(selectedRole === "borrower" ? "borrower" : "lender")
  }

  function handleLogout() {
    setIsLoggedIn(false)
    setActiveView("overview")
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      <AppSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        role={role}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 z-10 h-14 border-b border-border bg-background/80 backdrop-blur-xl flex items-center px-8 transition-colors duration-300"
        >
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="size-2 rounded-full bg-primary"
            />
            <span className="text-sm text-muted-foreground">
              Canton Ledger
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {error && <span className="text-xs text-destructive">{error}</span>}
            {useApi && <span className="text-[10px] text-muted-foreground bg-primary/10 px-1.5 py-0.5 rounded">API</span>}
            <span className="text-sm text-muted-foreground">
              {role === "borrower" ? "app-user" : "lender"}
            </span>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="size-8 rounded-full bg-secondary flex items-center justify-center cursor-pointer transition-colors duration-200"
            >
              <span className="text-foreground text-xs font-semibold">
                {role === "borrower" ? "B" : "L"}
              </span>
            </motion.div>
          </div>
        </motion.header>

        {/* Content with view transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="p-8 max-w-6xl"
          >
            {activeView === "overview" && (
              <OverviewDashboard
                stats={platformStats}
                recentLoans={loans}
              />
            )}

            {activeView === "borrower" && (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">
                <BorrowerDashboard
                  requests={requests}
                  offers={offers}
                  loans={loans}
                  creditProfileId={creditProfile.contractId}
                  onCreateRequest={createLoanRequest}
                  onAcceptOffer={fundLoan}
                  onRepay={repayLoan}
                />
                <div>
                  <CreditScoreCard profile={creditProfile} />
                </div>
              </div>
            )}

            {activeView === "lender" && (
              <LenderDashboard
                requests={requests}
                loans={loans}
                bids={bids}
                onMakeOffer={createLoanOffer}
                onMarkDefault={markLoanDefault}
                onPlaceBid={createLenderBid}
                onCancelBid={cancelLenderBid}
              />
            )}

            {activeView === "orderbook" && (
              <MarketDepth bids={bids} asks={asks} />
            )}

            {activeView === "privacy" && <PrivacyView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
