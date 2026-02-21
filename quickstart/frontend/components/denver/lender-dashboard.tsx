"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Clock,
  DollarSign,
  Percent,
  Send,
  Loader2,
  AlertTriangle,
  Wallet,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
} from "lucide-react"
import type { LoanRequest, ActiveLoan, LenderBid } from "@/lib/mock-data"
import type { ApiFundingIntent, ApiPrincipalRequest, ApiRepaymentRequest, ApiMatchedProposal } from "@/lib/api-types"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function statusBadge(status: string) {
  switch (status) {
    case "open": return "bg-primary/10 text-primary border-transparent"
    case "funded": case "active": case "filled": return "bg-primary/10 text-primary border-transparent"
    case "repaid": return "bg-secondary text-muted-foreground border-transparent"
    case "defaulted": return "bg-destructive/10 text-destructive border-transparent"
    case "partial": return "bg-warning/10 text-foreground border-transparent"
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

function MakeOfferForm({
  request,
  onClose,
  onSubmit,
}: {
  request: LoanRequest
  onClose: () => void
  onSubmit?: (payload: { loanRequestId: string; amount: number; interestRate: number; duration: number }) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const amount = Number((form.querySelector("#offer-amount") as HTMLInputElement)?.value) || 0
    const interestRate = Number((form.querySelector("#offer-rate") as HTMLInputElement)?.value) || 0
    const duration = Number((form.querySelector("#offer-duration") as HTMLInputElement)?.value) || 0
    if (amount <= 0) { setError("Amount must be greater than 0"); return }
    if (interestRate <= 0 || interestRate > 100) { setError("Interest rate must be between 0 and 100"); return }
    if (duration <= 0 || duration > 120) { setError("Duration must be between 1 and 120 months"); return }
    setLoading(true)
    try {
      if (onSubmit) await onSubmit({ loanRequestId: request.contractId, amount, interestRate, duration })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
        <p>Offering on: <span className="text-foreground font-medium">{request.purpose}</span></p>
        <p>Requested: {formatCurrency(request.amount)} at {request.interestRate}% for {request.duration}mo</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="offer-amount" className="text-sm text-foreground">Loan Amount (USD)</Label>
        <Input id="offer-amount" type="number" defaultValue={request.amount} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="offer-rate" className="text-sm text-foreground">Interest Rate (%)</Label>
        <Input id="offer-rate" type="number" step="0.1" defaultValue={request.interestRate} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="offer-duration" className="text-sm text-foreground">Length of Loan (months)</Label>
        <Input id="offer-duration" type="number" min={1} max={120} defaultValue={request.duration} required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
        {loading ? (<><Loader2 className="size-4 animate-spin" />Submitting...</>) : "Submit Offer"}
      </Button>
    </motion.form>
  )
}

function PlaceBidForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit?: (payload: { amount: number; minInterestRate: number; maxDuration: number }) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const amount = Number((form.querySelector("#bid-amount") as HTMLInputElement)?.value) || 0
    const minInterestRate = Number((form.querySelector("#min-rate") as HTMLInputElement)?.value) || 0
    const maxDuration = Number((form.querySelector("#max-dur") as HTMLInputElement)?.value) || 0
    if (amount <= 0) { setError("Amount must be greater than 0"); return }
    if (minInterestRate <= 0 || minInterestRate > 100) { setError("Interest rate must be between 0 and 100"); return }
    if (maxDuration <= 0 || maxDuration > 120) { setError("Max duration must be between 1 and 120 months"); return }
    setLoading(true)
    try {
      if (onSubmit) await onSubmit({ amount, minInterestRate, maxDuration })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bid")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="rounded-lg bg-primary/5 p-3 text-xs text-foreground border border-primary/10">
        Your bid will be added to the order book and matched against borrower asks.
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bid-amount" className="text-sm text-foreground">Liquidity Amount (USD)</Label>
        <Input id="bid-amount" type="number" placeholder="10000" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="min-rate" className="text-sm text-foreground">Min Rate (%)</Label>
          <Input id="min-rate" type="number" step="0.1" placeholder="5.0" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="max-dur" className="text-sm text-foreground">Max Duration (mo)</Label>
          <Input id="max-dur" type="number" placeholder="24" required />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
        {loading ? (<><Loader2 className="size-4 animate-spin" />Placing Bid...</>) : "Place Lender Bid"}
      </Button>
    </motion.form>
  )
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 px-4"><Skeleton className="h-4 w-28" /></td>
      <td className="py-3 px-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
      <td className="py-3 px-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
      <td className="py-3 px-4"><Skeleton className="h-4 w-14 ml-auto" /></td>
      <td className="py-3 px-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
      <td className="py-3 px-4"><Skeleton className="h-7 w-16 rounded-lg ml-auto" /></td>
    </tr>
  )
}

function BidCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-8 w-16 rounded-lg shrink-0" />
    </div>
  )
}

export function LenderDashboard({
  requests,
  loans,
  bids,
  currentParty,
  walletUrl,
  fundingIntents = [],
  principalRequests = [],
  repaymentRequests = [],
  matchedProposals = [],
  onMakeOffer,
  onMarkDefault,
  onPlaceBid,
  onCancelBid,
  onConfirmFundingIntent,
  onCompleteFunding,
  onCompleteRepayment,
  isLoading,
  onAcceptProposal,
  onRejectProposal,
}: {
  requests: LoanRequest[]
  loans: ActiveLoan[]
  bids: LenderBid[]
  currentParty?: string
  walletUrl?: string | null
  fundingIntents?: ApiFundingIntent[]
  principalRequests?: ApiPrincipalRequest[]
  repaymentRequests?: ApiRepaymentRequest[]
  matchedProposals?: ApiMatchedProposal[]
  isLoading?: boolean
  onMakeOffer?: (payload: { loanRequestId: string; amount: number; interestRate: number; duration: number }) => Promise<void>
  onMarkDefault?: (loanContractId: string) => Promise<void>
  onPlaceBid?: (payload: { amount: number; minInterestRate: number; maxDuration: number }) => Promise<void>
  onCancelBid?: (contractId: string) => Promise<void>
  onConfirmFundingIntent?: (intentContractId: string) => Promise<void>
  onCompleteFunding?: (principalRequestId: string, allocationContractId: string) => Promise<void>
  onCompleteRepayment?: (repaymentRequestId: string, allocationContractId: string) => Promise<void>
  onAcceptProposal?: (contractId: string) => Promise<void>
  onRejectProposal?: (contractId: string) => Promise<void>
}) {
  const [offerDialog, setOfferDialog] = useState<LoanRequest | null>(null)
  const [bidDialogOpen, setBidDialogOpen] = useState(false)
  const openRequests = requests.filter(
    (r) => r.status === "open" && (!currentParty || r.borrower !== currentParty)
  )
  const myLoans = currentParty
    ? loans.filter((l) => l.lender === currentParty)
    : loans
  const myBids = currentParty
    ? bids.filter((b) => b.lender === currentParty)
    : bids
  const myFundingIntents = currentParty
    ? fundingIntents.filter((f) => f.lender === currentParty)
    : fundingIntents
  const myPrincipalRequests = currentParty
    ? principalRequests.filter((p) => p.lender === currentParty)
    : principalRequests
  const myRepaymentRequests = currentParty
    ? repaymentRequests.filter((r) => r.lender === currentParty)
    : repaymentRequests
  const myMatchedProposals = currentParty
    ? matchedProposals.filter((p) => p.lender === currentParty)
    : matchedProposals
  const hasPendingActions = myFundingIntents.length > 0 || myPrincipalRequests.length > 0 || myRepaymentRequests.length > 0

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-8">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Lender</h2>
          <p className="text-sm text-muted-foreground mt-1">Browse requests, make offers, and manage liquidity</p>
        </div>
        <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90"><Wallet className="size-4" />Place Bid</Button>
            </motion.div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Place Lender Bid</DialogTitle>
              <DialogDescription>Specify bid parameters for the lending order book.</DialogDescription>
            </DialogHeader>
            <PlaceBidForm onClose={() => setBidDialogOpen(false)} onSubmit={onPlaceBid} />
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Open Requests Table */}
      <motion.section variants={fadeUp}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Open Loan Requests</h3>
          <span className="text-xs text-muted-foreground">{openRequests.length} available</span>
        </div>
        <div className="rounded-xl border border-border overflow-hidden transition-colors duration-300">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Purpose</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">Amount</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">Rate</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">Duration</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">Date</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && openRequests.length === 0 && (
                [0, 1, 2].map((i) => <TableRowSkeleton key={i} />)
              )}
              {openRequests.map((request, i) => (
                <motion.tr
                  key={request.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.3 }}
                  className={cn(
                    "hover:bg-secondary/30 transition-colors duration-150",
                    i < openRequests.length - 1 && "border-b border-border"
                  )}
                >
                  <td className="py-3 px-4"><span className="text-sm font-medium text-foreground">{request.purpose}</span></td>
                  <td className="py-3 px-4 text-right"><span className="text-sm text-foreground">{formatCurrency(request.amount)}</span></td>
                  <td className="py-3 px-4 text-right"><span className="text-sm font-medium text-primary">{request.interestRate}%</span></td>
                  <td className="py-3 px-4 text-right"><span className="text-sm text-muted-foreground">{request.duration}mo</span></td>
                  <td className="py-3 px-4 text-right"><span className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</span></td>
                  <td className="py-3 px-4 text-right">
                    <Dialog open={offerDialog?.id === request.id} onOpenChange={(open) => setOfferDialog(open ? request : null)}>
                      <DialogTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
                          <Button size="sm" variant="outline" className="text-xs h-7"><Send className="size-3" />Offer</Button>
                        </motion.div>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Make an Offer</DialogTitle>
                          <DialogDescription>Create a loan offer for this request.</DialogDescription>
                        </DialogHeader>
                        <MakeOfferForm request={request} onClose={() => setOfferDialog(null)} onSubmit={onMakeOffer} />
                      </DialogContent>
                    </Dialog>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* My Bids */}
      <motion.section variants={fadeUp}>
        <h3 className="text-sm font-semibold text-foreground mb-4">My Liquidity Bids</h3>
        {isLoading && myBids.length === 0 ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
                <BidCardSkeleton />
              </motion.div>
            ))}
          </div>
        ) : myBids.length > 0 ? (
          <div className="flex flex-col gap-3">
            {myBids.map((bid, i) => (
              <motion.div
                key={bid.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06, duration: 0.35 }}
                whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
                className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors duration-200"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(bid.amount)} liquidity</span>
                    <Badge className={cn("text-[10px] font-medium", statusBadge(bid.status))}>{bid.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Min {bid.minInterestRate}%</span>
                    <span>Max {bid.maxDuration}mo</span>
                    <span>Remaining: {formatCurrency(bid.remainingAmount)}</span>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/5 shrink-0 h-8"
                    onClick={() => onCancelBid?.(bid.contractId)}
                    disabled={!onCancelBid}
                  >Cancel</Button>
                </motion.div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No active bids. Place a bid to provide liquidity.</p>
          </div>
        )}
      </motion.section>

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
                    <span>{proposal.interestRate}% APR</span>
                    <span>{Math.round(proposal.durationDays / 30)}mo</span>
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
                      Reject
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Pending Token Actions */}
      {hasPendingActions && (
        <motion.section variants={fadeUp}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Pending Token Actions</h3>
          <div className="flex flex-col gap-3">
            {/* Funding intents awaiting lender confirmation */}
            {myFundingIntents.map((fi, i) => (
              <motion.div
                key={`fi-${fi.contractId}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
                className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 transition-colors duration-200"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      Fund Loan: {formatCurrency(fi.principal)}
                    </span>
                    <Badge className="text-[10px] font-medium bg-warning/10 text-foreground border-transparent">
                      confirm required
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{fi.interestRate}% APR</span>
                    <span>{fi.durationDays} days</span>
                    <span>Borrower requested token funding</span>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    className="text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => onConfirmFundingIntent?.(fi.contractId)}
                    disabled={!onConfirmFundingIntent}
                  >
                    <CheckCircle2 className="size-3" />Confirm
                  </Button>
                </motion.div>
              </motion.div>
            ))}

            {/* Principal requests awaiting lender token allocation */}
            {myPrincipalRequests.map((pr, i) => {
              const hasAllocation = !!pr.allocationCid
              return (
                <motion.div
                  key={`pr-${pr.contractId}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
                  className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 transition-colors duration-200"
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        Fund Loan: {formatCurrency(pr.principal)}
                      </span>
                      <Badge className={cn("text-[10px] font-medium",
                        hasAllocation
                          ? "bg-primary/10 text-primary border-transparent"
                          : "bg-warning/10 text-foreground border-transparent"
                      )}>
                        {hasAllocation ? "ready to complete" : "allocate tokens"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{pr.interestRate}% APR</span>
                      <span>{pr.durationDays} days</span>
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
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="sm"
                        className="text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => pr.allocationCid && onCompleteFunding?.(pr.contractId, pr.allocationCid)}
                        disabled={!onCompleteFunding}
                      >
                        <CheckCircle2 className="size-3" />Complete Funding
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )
            })}

            {/* Repayment requests awaiting lender completion */}
            {myRepaymentRequests.map((rr, i) => {
              const hasAllocation = !!rr.allocationCid
              return (
                <motion.div
                  key={`rr-${rr.contractId}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
                  className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors duration-200"
                >
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        Repayment: {formatCurrency(rr.repaymentAmount)}
                      </span>
                      <Badge className={cn("text-[10px] font-medium",
                        hasAllocation
                          ? "bg-primary/10 text-primary border-transparent"
                          : "bg-warning/10 text-foreground border-transparent"
                      )}>
                        {hasAllocation ? "ready to complete" : "awaiting borrower"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>From borrower</span>
                      <span>Requested {formatDate(rr.requestedAt)}</span>
                    </div>
                  </div>
                  {hasAllocation && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        size="sm"
                        className="text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => rr.allocationCid && onCompleteRepayment?.(rr.contractId, rr.allocationCid)}
                        disabled={!onCompleteRepayment}
                      >
                        <CheckCircle2 className="size-3" />Complete Repayment
                      </Button>
                    </motion.div>
                  )}
                  {!hasAllocation && (
                    <span className="text-xs text-muted-foreground">Borrower allocating tokens...</span>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.section>
      )}

      {/* Funded Loans */}
      <motion.section variants={fadeUp}>
        <h3 className="text-sm font-semibold text-foreground mb-4">Funded Loans</h3>
        {isLoading && myLoans.length === 0 ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
                <BidCardSkeleton />
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
                transition={{ delay: 0.25 + i * 0.06, duration: 0.35 }}
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
                    <span>{loan.interestRate}% APR</span>
                    <span>Due {formatDate(loan.dueDate)}</span>
                  </div>
                </div>
                {loan.status === "active" && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-destructive border-destructive/20 hover:bg-destructive/5 shrink-0 h-8"
                      onClick={() => onMarkDefault?.(loan.contractId)}
                      disabled={!onMarkDefault}
                    >
                      <AlertTriangle className="size-3" />Mark Default
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No funded loans yet.</p>
          </div>
        )}
      </motion.section>
    </motion.div>
  )
}
