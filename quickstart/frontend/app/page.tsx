"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { LogOut, X } from "lucide-react"
import { AppSidebar } from "@/components/denver/app-sidebar"
import { LoginScreen } from "@/components/denver/login-screen"
import { BorrowerDashboard } from "@/components/denver/borrower-dashboard"
import { LenderDashboard } from "@/components/denver/lender-dashboard"
import { MarketDepth } from "@/components/denver/market-depth"
import { OrderBook } from "@/components/denver/order-book"
import { CreditScoreCard } from "@/components/denver/credit-score-card"
import { useDenverData } from "@/hooks/use-denver-data"

export default function DenverLendingApp() {
  const [activeView, setActiveView] = useState("borrower")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const {
    authStatus,
    currentUser,
    walletUrl,
    login,
    logout,
    requests,
    offers,
    loans,
    creditProfile,
    bids,
    asks,
    orderBook,
    fundingIntents,
    principalRequests,
    repaymentRequests,
    matchedProposals,
    loading,
    error,
    clearError,
    createLoanRequest,
    createLoanOffer,
    fundLoan,
    repayLoan,
    markLoanDefault,
    createLenderBid,
    cancelLenderBid,
    createBorrowerAsk,
    cancelBorrowerAsk,
    acceptProposal,
    rejectProposal,
    acceptOfferWithToken,
    confirmFundingIntent,
    completeFunding,
    requestRepayment,
    completeRepayment,
  } = useDenverData()

  // ---- loading / auth states ----

  if (authStatus === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-8"
        >
          {/* Pulsing rings around logo */}
          <div className="relative flex items-center justify-center">
            {[1, 2, 3].map((ring) => (
              <motion.div
                key={ring}
                className="absolute rounded-full border border-primary/30"
                animate={{ scale: [1, 1 + ring * 0.5], opacity: [0.7, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: (ring - 1) * 0.5, ease: "easeOut" }}
                style={{ width: 64, height: 64 }}
              />
            ))}
            <div className="size-24 flex items-center justify-center z-10">
              <img src="/logo.png" alt="Logo" className="size-24 object-contain" />
            </div>
          </div>

          {/* Text + bouncing dots */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-base font-semibold text-foreground">Credix</span>
            <span className="text-sm text-muted-foreground">Connecting to Canton ledger…</span>
            <div className="flex items-center gap-2 mt-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="size-2 rounded-full bg-primary"
                  animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                />
              ))}
            </div>
          </div>

          {/* Scanning bar */}
          <div className="w-48 h-0.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </div>
    )
  }

  if (authStatus === "unauthenticated" || authStatus === "no-backend") {
    return (
      <LoginScreen
        noBackend={authStatus === "no-backend"}
        login={login}
        onLogin={() => {
          setActiveView("borrower")
        }}
      />
    )
  }

  // ---- authenticated ----

  const displayName = currentUser?.name ?? "user"
  const partyId = currentUser?.party ?? "—"

  function handleLogout() {
    logout()
  }

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      <AppSidebar
        activeView={activeView}
        onViewChange={setActiveView}
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
          className="sticky top-0 z-10 h-14 border-b border-border bg-background/80 backdrop-blur-xl flex items-center px-8 transition-colors duration-300 relative overflow-hidden"
        >
          {/* Animated top-edge scanning bar shown whenever data is refreshing */}
          {loading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          )}
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
          <span className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold tracking-tight text-foreground">
            Credix
          </span>
          <div className="ml-auto flex items-center gap-4">
            {error && (
              <span className="text-xs text-destructive max-w-xs truncate flex items-center gap-1" title={error}>
                {error}
                <button onClick={clearError} className="hover:text-foreground transition-colors p-0.5 rounded">
                  <X className="size-3" />
                </button>
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-foreground text-[10px] font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-xs font-medium text-foreground">{displayName}</span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={partyId}>
                  {partyId.length > 20 ? partyId.slice(0, 20) + "…" : partyId}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
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
            {activeView === "borrower" && (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">
                <BorrowerDashboard
                  requests={requests}
                  offers={offers}
                  loans={loans}
                  asks={asks}
                  currentParty={partyId}
                  creditProfileId={creditProfile.contractId}
                  walletUrl={walletUrl}
                  repaymentRequests={repaymentRequests}
                  fundingIntents={fundingIntents}
                  matchedProposals={matchedProposals}
                  isLoading={loading}
                  onCreateRequest={createLoanRequest}
                  onAcceptOffer={fundLoan}
                  onAcceptOfferWithToken={acceptOfferWithToken}
                  onRepay={repayLoan}
                  onRequestRepayment={requestRepayment}
                  onAcceptProposal={acceptProposal}
                  onRejectProposal={rejectProposal}
                  onPlaceAsk={createBorrowerAsk}
                  onCancelAsk={cancelBorrowerAsk}
                />
                <div>
                  <CreditScoreCard profile={creditProfile} isLoading={loading} />
                </div>
              </div>
            )}

            {activeView === "lender" && (
              <LenderDashboard
                requests={requests}
                loans={loans}
                bids={bids}
                currentParty={partyId}
                walletUrl={walletUrl}
                fundingIntents={fundingIntents}
                principalRequests={principalRequests}
                repaymentRequests={repaymentRequests}
                matchedProposals={matchedProposals}
                isLoading={loading}
                onMakeOffer={createLoanOffer}
                onMarkDefault={markLoanDefault}
                onPlaceBid={createLenderBid}
                onCancelBid={cancelLenderBid}
                onConfirmFundingIntent={confirmFundingIntent}
                onCompleteFunding={completeFunding}
                onCompleteRepayment={completeRepayment}
                onAcceptProposal={acceptProposal}
                onRejectProposal={rejectProposal}
              />
            )}

            {activeView === "orderbook" && (
              <div className="flex flex-col gap-10">
                <OrderBook orderBookData={orderBook} />
                <MarketDepth orderBookData={orderBook} />
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
