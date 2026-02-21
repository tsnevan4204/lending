"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "motion/react"
import { LogOut, Loader2, X, Wallet } from "lucide-react"
import { AppSidebar } from "@/components/denver/app-sidebar"
import { LoginScreen } from "@/components/denver/login-screen"
import { BorrowerDashboard } from "@/components/denver/borrower-dashboard"
import { LenderDashboard } from "@/components/denver/lender-dashboard"
import { MarketDepth } from "@/components/denver/market-depth"
import { OrderBook } from "@/components/denver/order-book"
import { CreditScoreCard } from "@/components/denver/credit-score-card"
import { useDenverData } from "@/hooks/use-denver-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function DenverLendingApp() {
  const [activeView, setActiveView] = useState("borrower")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [walletDialogOpen, setWalletDialogOpen] = useState(false)
  const [walletInput, setWalletInput] = useState("")

  const {
    authStatus,
    currentUser,
    walletUrl,
    updateWalletUrl,
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
    withdrawLoanRequest,
    acceptProposal,
    rejectProposal,
    acceptOfferWithToken,
    confirmFundingIntent,
    completeFunding,
    requestRepayment,
    completeRepayment,
  } = useDenverData()

  useEffect(() => {
    if (walletDialogOpen) setWalletInput(walletUrl ?? "")
  }, [walletDialogOpen, walletUrl])

  // ---- loading / auth states ----

  if (authStatus === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <span className="text-sm">Connecting to Canton ledger…</span>
        </div>
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
            {loading && <Loader2 className="size-3 animate-spin text-muted-foreground ml-1" />}
          </div>
          <div className="ml-auto flex items-center gap-4">
            {error && (
              <span className="text-xs text-destructive max-w-xs truncate flex items-center gap-1" title={error}>
                {error}
                <button onClick={clearError} className="hover:text-foreground transition-colors p-0.5 rounded">
                  <X className="size-3" />
                </button>
              </span>
            )}
            <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
              <DialogTrigger asChild>
                <button
                  title={walletUrl ? `Wallet: ${walletUrl}` : "Set wallet URL"}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Wallet className={`size-3.5 ${walletUrl ? "text-primary" : ""}`} />
                  <span className="hidden sm:inline">{walletUrl ? "Wallet" : "Set Wallet"}</span>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Wallet Settings</DialogTitle>
                  <DialogDescription>
                    Configure your Canton wallet URL for token-based transactions. This overrides the URL provided by the backend.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 pt-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="wallet-url">Wallet URL</Label>
                    <Input
                      id="wallet-url"
                      type="url"
                      placeholder="https://wallet.example.com"
                      value={walletInput}
                      onChange={(e) => setWalletInput(e.target.value)}
                    />
                    {walletUrl && (
                      <p className="text-xs text-muted-foreground">Current: {walletUrl}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => { updateWalletUrl(walletInput.trim() || null); setWalletDialogOpen(false) }}
                    >
                      Save Wallet URL
                    </Button>
                    {walletUrl && (
                      <Button
                        variant="outline"
                        onClick={() => { updateWalletUrl(null); setWalletInput(""); setWalletDialogOpen(false) }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                  onCreateRequest={createLoanRequest}
                  onWithdrawRequest={withdrawLoanRequest}
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
                  <CreditScoreCard profile={creditProfile} />
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
