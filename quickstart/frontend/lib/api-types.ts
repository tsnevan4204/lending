// Backend API response types (from quickstart common/openapi.yaml)
// Used to map backend DTOs to Denver UI types.

export interface ApiLoanRequest {
  contractId: string
  underlyingRequestContractId?: string
  borrower: string
  amount: number
  interestRate: number
  durationDays: number
  purpose: string
  createdAt: string
}

export interface ApiLoanOffer {
  contractId: string
  loanRequestId?: string
  lender: string
  borrower: string
  amount: number
  interestRate: number
  durationDays?: number
  createdAt: string
}

export interface ApiLoan {
  contractId: string
  lender: string
  borrower: string
  principal: number
  interestRate: number
  dueDate: string
  status: "Active" | "Repaid" | "Defaulted"
  durationDays?: number
  purpose?: string
  fundedAt?: string
}

export interface ApiCreditProfile {
  contractId: string
  borrower: string
  creditScore: number
  totalLoans: number
  successfulLoans: number
  defaultedLoans: number
  createdAt?: string
}

export interface LoanRequestCreate {
  amount: number
  interestRate: number
  durationDays: number
  purpose: string
}

export interface LoanOfferCreate {
  loanRequestId: string
  amount: number
  interestRate: number
  durationDays?: number
}

export interface LoanFundRequest {
  creditProfileId: string
}

export interface ApiLenderBid {
  contractId: string
  lender: string
  amount: number
  remainingAmount: number
  minInterestRate: number
  maxDuration: number
  createdAt: string
}

export interface ApiBorrowerAsk {
  contractId: string
  borrower: string
  amount: number
  maxInterestRate: number
  duration: number
  createdAt: string
}

export interface LenderBidCreate {
  amount: number
  minInterestRate: number
  maxDuration: number
}

export interface BorrowerAskCreate {
  amount: number
  maxInterestRate: number
  duration: number
  creditProfileId: string
}

// --- Token-based funding flow ---

export interface AcceptOfferWithTokenRequest {
  creditProfileId: string
  requestId?: string | null
  description?: string | null
  prepareUntilDuration?: string | null
  settleBeforeDuration?: string | null
}

export interface ApiFundingIntent {
  contractId: string
  requestId: string
  lender: string
  borrower: string
  principal: number
  interestRate: number
  durationDays: number
  prepareUntil: string
  settleBefore: string
  requestedAt: string
  description?: string | null
  loanRequestId: string
  offerContractId: string
  creditProfileId: string
}

export interface ApiPrincipalRequest {
  contractId: string
  requestId: string
  lender: string
  borrower: string
  principal: number
  interestRate: number
  durationDays: number
  prepareUntil: string
  settleBefore: string
  requestedAt: string
  description?: string | null
  loanRequestId: string
  offerContractId: string
  creditProfileId: string
  allocationCid?: string | null
  prepareDeadlinePassed: boolean
  settleDeadlinePassed: boolean
}

export interface CompleteLoanFundingRequest {
  allocationContractId: string
}

// --- Token-based repayment flow ---

export interface RequestRepaymentRequest {
  requestId?: string | null
  description?: string | null
  prepareUntilDuration?: string | null
  settleBeforeDuration?: string | null
}

export interface ApiRepaymentRequest {
  contractId: string
  requestId: string
  lender: string
  borrower: string
  repaymentAmount: number
  prepareUntil: string
  settleBefore: string
  requestedAt: string
  description?: string | null
  loanContractId: string
  creditProfileId: string
  allocationCid?: string | null
  prepareDeadlinePassed: boolean
  settleDeadlinePassed: boolean
}

export interface CompleteLoanRepaymentRequest {
  allocationContractId: string
}

// --- Matched Loan Proposals ---

export interface ApiMatchedProposal {
  contractId: string
  lender: string
  borrower: string
  principal: number
  interestRate: number
  durationDays: number
  matchedAt: string
}

// --- Order Book (aggregated from MarketMaker LenderBid/BorrowerAsk) ---

export interface ApiOrderBookTier {
  interestRate: number
  duration: number
  totalAmount: number
  orderCount: number
}

export interface ApiOrderBookResponse {
  asks: ApiOrderBookTier[]
  bids: ApiOrderBookTier[]
  spread: number | null
}
