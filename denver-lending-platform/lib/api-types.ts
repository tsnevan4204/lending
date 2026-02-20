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
}

export interface LoanFundRequest {
  creditProfileId: string
}
