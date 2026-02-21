"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus,
  Clock,
  DollarSign,
  Percent,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Wallet,
  ExternalLink,
} from "lucide-react"
import type { LoanRequest, LoanOffer, ActiveLoan, BorrowerAsk } from "@/lib/mock-data"
import type { ApiRepaymentRequest, ApiFundingIntent, ApiMatchedProposal } from "@/lib/api-types"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function statusBadge(status: string) {
  switch (status) {
    case "open": return "bg-primary/10 text-primary border-transparent"
    case "funded": case "active": case "accepted": return "bg-primary/10 text-primary border-transparent"
    case "repaid": return "bg-secondary text-muted-foreground border-transparent"
    case "defaulted": return "bg-destructive/10 text-destructive border-transparent"
    case "pending": return "bg-warning/10 text-foreground border-transparent"
    default: return "bg-secondary text-muted-foreground border-transparent"
  }
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

const PURPOSE_OPTIONS: { value: string; label: string }[] = [
  { value: "equipment", label: "Equipment Purchase" },
  { value: "working-capital", label: "Working Capital" },
  { value: "expansion", label: "Business Expansion" },
  { value: "inventory", label: "Inventory" },
  { value: "marketing", label: "Marketing Campaign" },
  { value: "other", label: "Other" },
]

function LoanRequestForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit?: (payload: { amount: number; interestRate: number; duration: number; purpose: string }) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [purpose, setPurpose] = useState("other")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const amount = Number((form.querySelector("#amount") as HTMLInputElement)?.value) || 0
    const interestRate = Number((form.querySelector("#rate") as HTMLInputElement)?.value) || 0
    const duration = Number((form.querySelector("#duration") as HTMLInputElement)?.value) || 0
    if (amount <= 0) { setError("Amount must be greater than 0"); return }
    if (interestRate <= 0 || interestRate > 100) { setError("Interest rate must be between 0 and 100"); return }
    if (duration <= 0 || duration > 120) { setError("Duration must be between 1 and 120 months"); return }
    const purposeLabel = PURPOSE_OPTIONS.find((p) => p.value === purpose)?.label || "Other"
    setLoading(true)
    try {
      if (onSubmit) await onSubmit({ amount, interestRate, duration, purpose: purposeLabel })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="amount" className="text-sm text-foreground">Loan Amount (USD)</Label>
        <Input id="amount" type="number" placeholder="5000" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rate" className="text-sm text-foreground">Interest Rate (%)</Label>
          <Input id="rate" type="number" step="0.1" placeholder="8.5" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="duration" className="text-sm text-foreground">Duration (months)</Label>
          <Input id="duration" type="number" placeholder="12" required />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="purpose" className="text-sm text-foreground">Purpose</Label>
        <Select value={purpose} onValueChange={setPurpose} required>
          <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
          <SelectContent>
            {PURPOSE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
        {loading ? (<><Loader2 className="size-4 animate-spin" />Submitting...</>) : "Submit Loan Request"}
      </Button>
    </motion.form>
  )
}

function PlaceAskForm({
  creditProfileId,
  onClose,
  onSubmit,
}: {
  creditProfileId: string
  onClose: () => void
  onSubmit?: (payload: { amount: number; maxInterestRate: number; duration: number; creditProfileId: string }) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const amount = Number((form.querySelector("#ask-amount") as HTMLInputElement)?.value) || 0
    const maxInterestRate = Number((form.querySelector("#ask-rate") as HTMLInputElement)?.value) || 0
    const duration = Number((form.querySelector("#ask-duration") as HTMLInputElement)?.value) || 0
    if (amount <= 0) { setError("Amount must be greater than 0"); return }
    if (maxInterestRate <= 0 || maxInterestRate > 100) { setError("Max interest rate must be between 0 and 100"); return }
    if (duration <= 0 || duration > 120) { setError("Duration must be between 1 and 120 months"); return }
    setLoading(true)
    try {
      if (onSubmit) await onSubmit({ amount, maxInterestRate, duration, creditProfileId })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place ask")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      <div className="rounded-lg bg-primary/5 p-3 text-xs text-foreground border border-primary/10">
        Your ask will appear in the order book (Bids / Borrowers) and can be matched by lenders.
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ask-amount" className="text-sm text-foreground">Amount (USD)</Label>
        <Input id="ask-amount" type="number" placeholder="5000" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ask-rate" className="text-sm text-foreground">Max Rate (%)</Label>
          <Input id="ask-rate" type="number" step="0.1" placeholder="8.5" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ask-duration" className="text-sm text-foreground">Duration (mo)</Label>
          <Input id="ask-duration" type="number" placeholder="12" required />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
        {loading ? (<><Loader2 className="size-4 animate-spin" />Placing Ask...</>) : "Place Ask"}
      </Button>
    </motion.form>
  )
}

function LoanCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
    </div>
  )
}

export function BorrowerDashboard({
  requests,
  offers,
  loans,
  asks = [],
  currentParty,
  creditProfileId,
  walletUrl,
  repaymentRequests = [],
  fundingIntents = [],
  matchedProposals = [],
  onCreateRequest,
  onWithdrawRequest,
  onAcceptOffer,
  onAcceptOfferWithToken,
  onRepay,
  onRequestRepayment,
  onAcceptProposal,
  onRejectProposal,
  isLoading,
  onCancelAsk,
  onPlaceAsk,
}: {
  requests: LoanRequest[]
  offers: LoanOffer[]
  loans: ActiveLoan[]
  asks?: BorrowerAsk[]
  currentParty?: string
  creditProfileId?: string
  walletUrl?: string | null
  repaymentRequests?: ApiRepaymentRequest[]
  fundingIntents?: ApiFundingIntent[]
  matchedProposals?: ApiMatchedProposal[]
  isLoading?: boolean
  onCreateRequest?: (payload: { amount: number; interestRate: number; duration: number; purpose: string }) => Promise<void>
  onWithdrawRequest?: (contractId: string) => Promise<void>
  onAcceptOffer?: (offerContractId: string, creditProfileId: string) => Promise<void>
  onAcceptOfferWithToken?: (offerContractId: string, creditProfileId: string) => Promise<void>
  onRepay?: (loanContractId: string) => Promise<void>
  onRequestRepayment?: (loanContractId: string) => Promise<void>
  onAcceptProposal?: (contractId: string) => Promise<void>
  onRejectProposal?: (contractId: string) => Promise<void>
  onCancelAsk?: (contractId: string) => Promise<void>
  onPlaceAsk?: (payload: { amount: number; maxInterestRate: number; duration: number; creditProfileId: string }) => Promise<void>
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [askDialogOpen, setAskDialogOpen] = useState(false)
  const myAsks = currentParty
    ? (asks ?? []).filter((a) => a.borrower === currentParty)
    : (asks ?? [])
  const myRequests = currentParty
    ? requests.filter((r) => r.borrower === currentParty)
    : requests
  const myLoans = currentParty
    ? loans.filter((l) => l.borrower === currentParty)
    : loans
  const myRepaymentRequests = currentParty
    ? repaymentRequests.filter((r) => r.borrower === currentParty)
    : repaymentRequests
  const myFundingIntents = currentParty
    ? fundingIntents.filter((f) => f.borrower === currentParty)
    : fundingIntents
  const myMatchedProposals = currentParty
    ? matchedProposals.filter((p) => p.borrower === currentParty)
    : matchedProposals
  const hasWallet = !!walletUrl

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-8">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Borrower</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your loan requests and repayments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="size-4" />Request Loan
              </Button>
            </motion.div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Loan Request</DialogTitle>
              <DialogDescription>Fill in the details for your loan request.</DialogDescription>
            </DialogHeader>
            <LoanRequestForm onClose={() => setDialogOpen(false)} onSubmit={onCreateRequest} />
          </DialogContent>
        </Dialog>
        {onPlaceAsk && creditProfileId && (
          <Dialog open={askDialogOpen} onOpenChange={setAskDialogOpen}>
            <DialogTrigger asChild>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/5">
                  <Plus className="size-4" />Place Ask
                </Button>
              </motion.div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Place Order Book Ask</DialogTitle>
                <DialogDescription>Add your loan request to the order book so lenders can match.</DialogDescription>
              </DialogHeader>
              <PlaceAskForm
                creditProfileId={creditProfileId}
                onClose={() => setAskDialogOpen(false)}
                onSubmit={onPlaceAsk}
              />
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      {/* My Loan Requests */}
      <motion.section variants={fadeUp}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">My Loan Requests</h3>
          <span className="text-xs text-muted-foreground">{myRequests.length} requests</span>
        </div>
        <div className="flex flex-col gap-3">
          {isLoading && myRequests.length === 0 && (
            [0, 1, 2].map((i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }}>
                <LoanCardSkeleton />
              </motion.div>
            ))
          )}
          {myRequests.map((request, i) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
              whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
              className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors duration-200 cursor-default"
            >
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{request.purpose}</span>
                  <Badge className={cn("text-[10px] font-medium", statusBadge(request.status))}>{request.status}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><DollarSign className="size-3" />{formatCurrency(request.amount)}</span>
                  <span className="flex items-center gap-1"><Percent className="size-3" />{request.interestRate}%</span>
                  <span className="flex items-center gap-1"><Clock className="size-3" />{request.duration}mo</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {request.offersCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 + i * 0.06 }}
                    className="text-xs text-primary font-medium"
                  >
                    {request.offersCount} offer{request.offersCount > 1 ? "s" : ""}
                  </motion.span>
                )}
                {request.status === "open" && request.offersCount > 0 && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button size="sm" variant="outline" className="text-xs h-8">View<ArrowRight className="size-3" /></Button>
                  </motion.div>
                )}
                {request.status === "open" && onWithdrawRequest && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-destructive hover:text-destructive hover:bg-destructive/5 h-8"
                      onClick={() => onWithdrawRequest(request.id)}
                    >
                      Withdraw
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* My Asks (order book) */}
      <motion.section variants={fadeUp}>
        <h3 className="text-sm font-semibold text-foreground mb-4">My Order Book Asks</h3>
        {myAsks.length > 0 ? (
          <div className="flex flex-col gap-3">
            {myAsks.map((ask, i) => (
              <motion.div
                key={ask.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors duration-200"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(ask.amount)} ask</span>
                    <Badge className={cn("text-[10px] font-medium", statusBadge(ask.status))}>{ask.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Max {ask.maxInterestRate}%</span>
                    <span>{ask.duration}mo</span>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/5 shrink-0 h-8"
                    onClick={() => onCancelAsk?.(ask.contractId)}
                    disabled={!onCancelAsk}
                  >
                    Cancel
                  </Button>
                </motion.div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No active asks. Place an ask to participate in the order book.</p>
          </div>
        )}
      </motion.section>

      {/* Pending Offers */}
      {offers.length > 0 && (
        <motion.section variants={fadeUp}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Pending Offers</h3>
          <div className="flex flex-col gap-3">
            {offers.map((offer, i) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
                whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors duration-200"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Offer from Lender</span>
                    <Badge className={cn("text-[10px] font-medium", statusBadge(offer.status))}>{offer.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatCurrency(offer.amount)}</span>
                    <span>{offer.interestRate}%</span>
                    <span>{offer.duration}mo</span>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  {hasWallet && onAcceptOfferWithToken ? (
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs"
                      onClick={() => creditProfileId && onAcceptOfferWithToken(offer.contractId, creditProfileId)}
                      disabled={!creditProfileId}
                    >
                      <Wallet className="size-3" />Accept with Token
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs"
                      onClick={() => creditProfileId && onAcceptOffer?.(offer.contractId, creditProfileId)}
                      disabled={!creditProfileId || !onAcceptOffer}
                    >
                      <CheckCircle2 className="size-3" />Accept
                    </Button>
                  )}
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Matched Proposals */}
      {myMatchedProposals.length > 0 && (
        <motion.section variants={fadeUp}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Matched Proposals</h3>
          <div className="flex flex-col gap-3">
            {myMatchedProposals.map((proposal, i) => (
              <motion.div
                key={proposal.contractId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
                whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 transition-colors duration-200"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      Matched: {formatCurrency(proposal.principal)}
                    </span>
                    <Badge className="text-[10px] font-medium bg-primary/10 text-primary border-transparent">
                      awaiting acceptance
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Percent className="size-3" />{proposal.interestRate}%</span>
                    <span className="flex items-center gap-1"><Clock className="size-3" />{Math.round(proposal.durationDays / 30)}mo</span>
                    <span>Matched {new Date(proposal.matchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs"
                      onClick={() => onAcceptProposal?.(proposal.contractId)}
                      disabled={!onAcceptProposal}
                    >
                      <CheckCircle2 className="size-3" />Accept
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-destructive hover:text-destructive hover:bg-destructive/5 h-8"
                      onClick={() => onRejectProposal?.(proposal.contractId)}
                      disabled={!onRejectProposal}
                    >
                      Decline
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Active Loans */}
      <motion.section variants={fadeUp}>
        <h3 className="text-sm font-semibold text-foreground mb-4">Active Loans</h3>
        {isLoading && myLoans.length === 0 ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
                <LoanCardSkeleton />
              </motion.div>
            ))}
          </div>
        ) : myLoans.length > 0 ? (
          <div className="flex flex-col gap-3">
            {myLoans.map((loan, i) => (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06, duration: 0.35 }}
                whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors duration-200"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{loan.purpose}</span>
                    <Badge className={cn("text-[10px] font-medium", statusBadge(loan.status))}>{loan.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatCurrency(loan.amount)}</span>
                    <span>{loan.interestRate}%</span>
                    <span>Due {formatDate(loan.dueDate)}</span>
                  </div>
                </div>
                {loan.status === "active" && (
                  <div className="flex items-center gap-2">
                    {hasWallet && onRequestRepayment ? (
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          size="sm"
                          className="text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => onRequestRepayment(loan.contractId)}
                        >
                          <Wallet className="size-3" />Repay with Token
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8"
                          onClick={() => onRepay?.(loan.contractId)}
                          disabled={!onRepay}
                        >
                          Repay
                        </Button>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border p-8 text-center"
          >
            <p className="text-sm text-muted-foreground">No active loans yet. Accept an offer to get started.</p>
          </motion.div>
        )}
      </motion.section>

      {/* Pending Repayment Requests */}
      {myRepaymentRequests.length > 0 && (
        <motion.section variants={fadeUp}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Pending Repayments</h3>
          <div className="flex flex-col gap-3">
            {myRepaymentRequests.map((rr, i) => {
              const hasAllocation = !!rr.allocationCid
              return (
                <motion.div
                  key={rr.contractId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.35 }}
                  className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors duration-200"
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        Repayment: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(rr.repaymentAmount)}
                      </span>
                      <Badge className={cn("text-[10px] font-medium",
                        hasAllocation
                          ? "bg-primary/10 text-primary border-transparent"
                          : "bg-warning/10 text-foreground border-transparent"
                      )}>
                        {hasAllocation ? "allocated" : "awaiting wallet"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Requested {new Date(rr.requestedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      {rr.description && <span>{rr.description}</span>}
                    </div>
                  </div>
                  {!hasAllocation && walletUrl && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1.5"
                        onClick={() => window.open(walletUrl, "_blank", "noopener")}
                      >
                        <Wallet className="size-3" />Allocate in Wallet
                        <ExternalLink className="size-3" />
                      </Button>
                    </motion.div>
                  )}
                  {hasAllocation && (
                    <span className="text-xs text-primary font-medium">Awaiting lender</span>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* Pending Funding Intents (borrower awaiting lender confirmation) */}
      {myFundingIntents.length > 0 && (
        <motion.section variants={fadeUp}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Pending Token Funding</h3>
          <div className="flex flex-col gap-3">
            {myFundingIntents.map((fi, i) => (
              <motion.div
                key={fi.contractId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06, duration: 0.35 }}
                className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors duration-200"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      Funding: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(fi.principal)}
                    </span>
                    <Badge className="text-[10px] font-medium bg-warning/10 text-foreground border-transparent">
                      awaiting lender
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{fi.interestRate}% APR</span>
                    <span>{fi.durationDays} days</span>
                    <span>Requested {new Date(fi.requestedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Awaiting lender confirmation</span>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  )
}
