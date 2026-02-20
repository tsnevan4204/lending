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

// --- Order Book (Decentralized Matching Engine) ---

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

export interface ApiMatchedDeal {
  contractId: string
  principal: number
  interestRate: number
  durationDays: number
  matchedAt: string
  borrowerAccepted: boolean
  lenderAccepted: boolean
}

export interface ApiMatchedDealAcceptResult {
  accepted: boolean
  loanCreated: boolean
  loanContractId?: string
}

export interface BorrowOrderCreate {
  amount: number
  maxInterestRate: number
  duration: number
  purpose: string
  creditProfileId: string
}

export interface LendOrderCreate {
  amount: number
  minInterestRate: number
  duration: number
}
