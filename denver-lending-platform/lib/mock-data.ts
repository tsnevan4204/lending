// Mock data for Denver Lending UI
// This will be replaced with real API calls by Cursor

export type LoanRequest = {
  id: string
  contractId: string
  borrower: string
  amount: number
  interestRate: number
  duration: number
  purpose: string
  status: "open" | "offered" | "funded" | "repaid" | "defaulted"
  createdAt: string
  offersCount: number
}

export type LoanOffer = {
  id: string
  contractId: string
  lender: string
  loanRequestId: string
  amount: number
  interestRate: number
  duration: number
  status: "pending" | "accepted" | "rejected"
  createdAt: string
}

export type ActiveLoan = {
  id: string
  contractId: string
  borrower: string
  lender: string
  amount: number
  interestRate: number
  duration: number
  purpose: string
  status: "active" | "repaid" | "defaulted"
  fundedAt: string
  dueDate: string
}

export type CreditProfile = {
  contractId?: string
  score: number
  totalLoans: number
  successfulRepayments: number
  defaults: number
  lastUpdated: string
}

export type LenderBid = {
  id: string
  contractId: string
  lender: string
  amount: number
  minInterestRate: number
  maxDuration: number
  status: "active" | "filled" | "partial" | "cancelled"
  createdAt: string
  remainingAmount: number
}

export type BorrowerAsk = {
  id: string
  contractId: string
  borrower: string
  amount: number
  maxInterestRate: number
  duration: number
  status: "active" | "filled" | "cancelled"
  createdAt: string
}

export type OrderBookEntry = {
  rate: number
  totalAmount: number
  count: number
}

// --- Mock Data ---

export const mockLoanRequests: LoanRequest[] = [
  {
    id: "lr-001",
    contractId: "00a1b2c3d4",
    borrower: "app-user",
    amount: 5000,
    interestRate: 8.5,
    duration: 12,
    purpose: "Equipment Purchase",
    status: "open",
    createdAt: "2026-02-15T10:30:00Z",
    offersCount: 3,
  },
  {
    id: "lr-002",
    contractId: "00e5f6g7h8",
    borrower: "app-user",
    amount: 2500,
    interestRate: 6.0,
    duration: 6,
    purpose: "Working Capital",
    status: "funded",
    createdAt: "2026-02-10T14:20:00Z",
    offersCount: 1,
  },
  {
    id: "lr-003",
    contractId: "00i9j0k1l2",
    borrower: "borrower-2",
    amount: 10000,
    interestRate: 10.0,
    duration: 24,
    purpose: "Business Expansion",
    status: "open",
    createdAt: "2026-02-18T09:15:00Z",
    offersCount: 0,
  },
  {
    id: "lr-004",
    contractId: "00m3n4o5p6",
    borrower: "borrower-3",
    amount: 1500,
    interestRate: 5.5,
    duration: 3,
    purpose: "Inventory",
    status: "open",
    createdAt: "2026-02-19T08:00:00Z",
    offersCount: 2,
  },
  {
    id: "lr-005",
    contractId: "00q7r8s9t0",
    borrower: "app-user",
    amount: 7500,
    interestRate: 9.0,
    duration: 18,
    purpose: "Marketing Campaign",
    status: "open",
    createdAt: "2026-02-17T16:45:00Z",
    offersCount: 1,
  },
]

export const mockLoanOffers: LoanOffer[] = [
  {
    id: "lo-001",
    contractId: "01a1b2c3d4",
    lender: "lender",
    loanRequestId: "lr-001",
    amount: 5000,
    interestRate: 8.5,
    duration: 12,
    status: "pending",
    createdAt: "2026-02-16T11:00:00Z",
  },
  {
    id: "lo-002",
    contractId: "01e5f6g7h8",
    lender: "lender-2",
    loanRequestId: "lr-001",
    amount: 5000,
    interestRate: 7.8,
    duration: 12,
    status: "pending",
    createdAt: "2026-02-16T12:30:00Z",
  },
  {
    id: "lo-003",
    contractId: "01i9j0k1l2",
    lender: "lender",
    loanRequestId: "lr-004",
    amount: 1500,
    interestRate: 5.5,
    duration: 3,
    status: "pending",
    createdAt: "2026-02-19T09:30:00Z",
  },
]

export const mockActiveLoans: ActiveLoan[] = [
  {
    id: "al-001",
    contractId: "02a1b2c3d4",
    borrower: "app-user",
    lender: "lender",
    amount: 2500,
    interestRate: 6.0,
    duration: 6,
    purpose: "Working Capital",
    status: "active",
    fundedAt: "2026-02-11T10:00:00Z",
    dueDate: "2026-08-11T10:00:00Z",
  },
  {
    id: "al-002",
    contractId: "02e5f6g7h8",
    borrower: "borrower-2",
    lender: "lender",
    amount: 3000,
    interestRate: 7.5,
    duration: 12,
    purpose: "Equipment",
    status: "active",
    fundedAt: "2026-01-15T14:00:00Z",
    dueDate: "2027-01-15T14:00:00Z",
  },
  {
    id: "al-003",
    contractId: "02i9j0k1l2",
    borrower: "app-user",
    lender: "lender-2",
    amount: 1000,
    interestRate: 5.0,
    duration: 3,
    purpose: "Supplies",
    status: "repaid",
    fundedAt: "2025-11-01T09:00:00Z",
    dueDate: "2026-02-01T09:00:00Z",
  },
]

export const mockCreditProfile: CreditProfile = {
  score: 720,
  totalLoans: 8,
  successfulRepayments: 6,
  defaults: 1,
  lastUpdated: "2026-02-19T12:00:00Z",
}

export const mockLenderBids: LenderBid[] = [
  { id: "lb-001", contractId: "03a1", lender: "lender", amount: 20000, minInterestRate: 5.0, maxDuration: 24, status: "active", createdAt: "2026-02-19T08:00:00Z", remainingAmount: 15000 },
  { id: "lb-002", contractId: "03b2", lender: "lender-2", amount: 10000, minInterestRate: 5.5, maxDuration: 12, status: "active", createdAt: "2026-02-19T07:30:00Z", remainingAmount: 10000 },
  { id: "lb-003", contractId: "03c3", lender: "lender-3", amount: 50000, minInterestRate: 6.0, maxDuration: 36, status: "active", createdAt: "2026-02-18T22:00:00Z", remainingAmount: 42000 },
  { id: "lb-004", contractId: "03d4", lender: "lender", amount: 8000, minInterestRate: 6.5, maxDuration: 18, status: "active", createdAt: "2026-02-18T20:00:00Z", remainingAmount: 8000 },
  { id: "lb-005", contractId: "03e5", lender: "lender-4", amount: 15000, minInterestRate: 7.0, maxDuration: 24, status: "active", createdAt: "2026-02-18T18:00:00Z", remainingAmount: 15000 },
  { id: "lb-006", contractId: "03f6", lender: "lender-5", amount: 30000, minInterestRate: 7.5, maxDuration: 12, status: "active", createdAt: "2026-02-18T16:00:00Z", remainingAmount: 25000 },
  { id: "lb-007", contractId: "03g7", lender: "lender-2", amount: 12000, minInterestRate: 8.0, maxDuration: 24, status: "active", createdAt: "2026-02-18T14:00:00Z", remainingAmount: 12000 },
]

export const mockBorrowerAsks: BorrowerAsk[] = [
  { id: "ba-001", contractId: "04a1", borrower: "borrower-1", amount: 5000, maxInterestRate: 9.0, duration: 12, status: "active", createdAt: "2026-02-19T09:00:00Z" },
  { id: "ba-002", contractId: "04b2", borrower: "borrower-2", amount: 3000, maxInterestRate: 8.5, duration: 6, status: "active", createdAt: "2026-02-19T08:45:00Z" },
  { id: "ba-003", contractId: "04c3", borrower: "borrower-3", amount: 10000, maxInterestRate: 8.0, duration: 24, status: "active", createdAt: "2026-02-19T08:30:00Z" },
  { id: "ba-004", contractId: "04d4", borrower: "borrower-4", amount: 2000, maxInterestRate: 7.5, duration: 3, status: "active", createdAt: "2026-02-19T08:15:00Z" },
  { id: "ba-005", contractId: "04e5", borrower: "borrower-5", amount: 7500, maxInterestRate: 7.0, duration: 18, status: "active", createdAt: "2026-02-19T08:00:00Z" },
  { id: "ba-006", contractId: "04f6", borrower: "borrower-1", amount: 4000, maxInterestRate: 6.5, duration: 12, status: "active", createdAt: "2026-02-19T07:45:00Z" },
]

// Aggregated order book data
export function aggregateOrderBook(bids: LenderBid[], asks: BorrowerAsk[]): {
  bidBook: OrderBookEntry[]
  askBook: OrderBookEntry[]
} {
  const bidMap = new Map<number, { totalAmount: number; count: number }>()
  for (const bid of bids) {
    const rate = bid.minInterestRate
    const existing = bidMap.get(rate) || { totalAmount: 0, count: 0 }
    existing.totalAmount += bid.remainingAmount
    existing.count += 1
    bidMap.set(rate, existing)
  }

  const askMap = new Map<number, { totalAmount: number; count: number }>()
  for (const ask of asks) {
    const rate = ask.maxInterestRate
    const existing = askMap.get(rate) || { totalAmount: 0, count: 0 }
    existing.totalAmount += ask.amount
    existing.count += 1
    askMap.set(rate, existing)
  }

  const bidBook: OrderBookEntry[] = Array.from(bidMap.entries())
    .map(([rate, data]) => ({ rate, ...data }))
    .sort((a, b) => a.rate - b.rate)

  const askBook: OrderBookEntry[] = Array.from(askMap.entries())
    .map(([rate, data]) => ({ rate, ...data }))
    .sort((a, b) => b.rate - a.rate)

  return { bidBook, askBook }
}

// Platform stats
export const mockPlatformStats = {
  totalValueLocked: 2450000,
  totalLoansOriginated: 847,
  averageInterestRate: 7.2,
  activeLoans: 156,
  totalLenders: 42,
  totalBorrowers: 213,
}
