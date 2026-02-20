/**
 * Denver Lending API client.
 * Calls the quickstart backend at /api (or NEXT_PUBLIC_API_URL).
 * Maps backend DTOs to Denver UI types (see mock-data.ts).
 */

import type {
  LoanRequest,
  LoanOffer,
  ActiveLoan,
  CreditProfile,
  LenderBid,
  BorrowerAsk,
} from "@/lib/mock-data"
import type {
  ApiLoanRequest,
  ApiLoanOffer,
  ApiLoan,
  ApiCreditProfile,
  LoanRequestCreate,
  LoanOfferCreate,
  LoanFundRequest,
} from "@/lib/api-types"

const API_BASE = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "/api") : ""

function daysToMonths(days: number): number {
  return Math.round(days / 30) || 1
}

function monthsToDays(months: number): number {
  return months * 30
}

function mapLoanRequest(r: ApiLoanRequest, offersCount = 0): LoanRequest {
  const requestId = r.underlyingRequestContractId || r.contractId
  return {
    id: requestId,
    contractId: r.contractId,
    borrower: r.borrower,
    amount: r.amount,
    interestRate: r.interestRate,
    duration: daysToMonths(r.durationDays),
    purpose: r.purpose,
    status: "open",
    createdAt: r.createdAt,
    offersCount,
  }
}

function mapLoanOffer(o: ApiLoanOffer): LoanOffer {
  return {
    id: o.contractId,
    contractId: o.contractId,
    lender: o.lender,
    loanRequestId: o.loanRequestId || "",
    amount: o.amount,
    interestRate: o.interestRate,
    duration: 0, // not in API; could derive from request
    status: "pending",
    createdAt: o.createdAt,
  }
}

function mapLoan(l: ApiLoan): ActiveLoan {
  const status = l.status === "Active" ? "active" : l.status === "Repaid" ? "repaid" : "defaulted"
  return {
    id: l.contractId,
    contractId: l.contractId,
    borrower: l.borrower,
    lender: l.lender,
    amount: l.principal,
    interestRate: l.interestRate,
    duration: 0,
    purpose: "",
    status,
    fundedAt: l.dueDate,
    dueDate: l.dueDate,
  }
}

function mapCreditProfile(c: ApiCreditProfile): CreditProfile {
  return {
    contractId: c.contractId,
    score: c.creditScore,
    totalLoans: c.totalLoans,
    successfulRepayments: c.successfulLoans,
    defaults: c.defaultedLoans,
    lastUpdated: c.createdAt || new Date().toISOString(),
  }
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${path}: ${res.status} ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function postApi<T>(path: string, body?: object): Promise<T> {
  return fetchApi<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  })
}

function commandId(): string {
  return `denver-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Check if backend is reachable (e.g. from quickstart stack). */
export async function isApiAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/user`, { credentials: "include", method: "GET" })
    return res.ok || res.status === 401
  } catch {
    return false
  }
}

/** List loan requests visible to the authenticated party. */
export async function listLoanRequests(): Promise<LoanRequest[]> {
  const raw = await fetchApi<ApiLoanRequest[]>("/loan-requests")
  const offers = await listLoanOffers()
  const byRequest = new Map<string, number>()
  for (const o of offers) {
    const id = o.loanRequestId || ""
    byRequest.set(id, (byRequest.get(id) || 0) + 1)
  }
  return (raw || []).map((r) => mapLoanRequest(r, byRequest.get(r.contractId) || byRequest.get(r.underlyingRequestContractId || "") || 0))
}

/** List loan offers visible to the authenticated party. */
export async function listLoanOffers(): Promise<LoanOffer[]> {
  const raw = await fetchApi<ApiLoanOffer[]>("/loan-offers")
  return (raw || []).map(mapLoanOffer)
}

/** List active loans visible to the authenticated party. */
export async function listLoans(): Promise<ActiveLoan[]> {
  const raw = await fetchApi<ApiLoan[]>("/loans")
  return (raw || []).map(mapLoan)
}

/** Get credit profile for the authenticated borrower. */
export async function getCreditProfile(): Promise<CreditProfile | null> {
  try {
    const raw = await fetchApi<ApiCreditProfile>("/credit-profile")
    return mapCreditProfile(raw)
  } catch (e) {
    if (e instanceof Error && (e.message.includes("404") || e.message.includes("NotFound"))) return null
    throw e
  }
}

/** Create a loan request (borrower). */
export async function createLoanRequest(payload: {
  amount: number
  interestRate: number
  duration: number
  purpose: string
}): Promise<LoanRequest> {
  const body: LoanRequestCreate = {
    amount: payload.amount,
    interestRate: payload.interestRate,
    durationDays: monthsToDays(payload.duration),
    purpose: payload.purpose,
  }
  const raw = await postApi<ApiLoanRequest>("/loans/request?commandId=" + encodeURIComponent(commandId()), body)
  return mapLoanRequest(raw, 0)
}

/** Create a loan offer (lender). */
export async function createLoanOffer(payload: {
  loanRequestId: string
  amount: number
  interestRate: number
}): Promise<LoanOffer> {
  const body: LoanOfferCreate = {
    loanRequestId: payload.loanRequestId,
    amount: payload.amount,
    interestRate: payload.interestRate,
  }
  const raw = await postApi<ApiLoanOffer>("/loans/offer?commandId=" + encodeURIComponent(commandId()), body)
  return mapLoanOffer(raw)
}

/** Accept offer and fund loan (borrower). */
export async function fundLoan(offerContractId: string, creditProfileId: string): Promise<{ loanId: string }> {
  const body: LoanFundRequest = { creditProfileId }
  return postApi<{ loanId: string }>(
    `/loans/offers/${encodeURIComponent(offerContractId)}/fund?commandId=${encodeURIComponent(commandId())}`,
    body
  )
}

/** Repay a loan (borrower). */
export async function repayLoan(loanContractId: string): Promise<void> {
  await postApi(`/loans/${encodeURIComponent(loanContractId)}/repay?commandId=${encodeURIComponent(commandId())}`)
}

/** Mark loan as defaulted (lender). Backend may not expose this yet; 404 is expected until implemented. */
export async function markLoanDefault(loanContractId: string): Promise<void> {
  await postApi(`/loans/${encodeURIComponent(loanContractId)}:mark-default?commandId=${encodeURIComponent(commandId())}`)
}

// --- Not yet in backend: order book & platform stats. Stub so UI can switch when backend adds them. ---

/** List lender bids (order book). Not implemented in backend yet; return empty. */
export async function listLenderBids(): Promise<LenderBid[]> {
  try {
    const res = await fetch(`${API_BASE}/lender-bids`, { credentials: "include" })
    if (res.status === 404) return []
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/** List borrower asks (order book). Not implemented in backend yet; return empty. */
export async function listBorrowerAsks(): Promise<BorrowerAsk[]> {
  try {
    const res = await fetch(`${API_BASE}/borrower-asks`, { credentials: "include" })
    if (res.status === 404) return []
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/** Platform stats. Not implemented in backend yet; return null so UI can use mock. */
export async function getPlatformStats(): Promise<{
  totalValueLocked: number
  totalLoansOriginated: number
  averageInterestRate: number
  activeLoans: number
  totalLenders: number
  totalBorrowers: number
} | null> {
  try {
    const res = await fetch(`${API_BASE}/platform-stats`, { credentials: "include" })
    if (res.status !== 200) return null
    return res.json()
  } catch {
    return null
  }
}
