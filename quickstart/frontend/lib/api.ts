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
  ApiLenderBid,
  ApiBorrowerAsk,
  LoanRequestCreate,
  LoanOfferCreate,
  LoanFundRequest,
  LenderBidCreate,
  BorrowerAskCreate,
  ApiOrderBookResponse,
  AcceptOfferWithTokenRequest,
  ApiFundingIntent,
  ApiPrincipalRequest,
  CompleteLoanFundingRequest,
  RequestRepaymentRequest,
  ApiRepaymentRequest,
  CompleteLoanRepaymentRequest,
  ApiMatchedProposal,
} from "@/lib/api-types"

const API_BASE = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "/api") : ""

// ---- Auth types ----

// Field names match the generated AuthenticatedUser model from openapi.yaml: name, party, roles, isAdmin, walletUrl
export interface ApiUser {
  name: string
  party: string
  roles: string[]
  isAdmin: boolean
  walletUrl: string | null
}

// ---- Auth API ----

/**
 * Returns the currently authenticated user, or null if not logged in.
 * This is the source of truth for auth state.
 */
export async function getUser(): Promise<ApiUser | null> {
  try {
    const res = await fetch(`${API_BASE}/user`, { credentials: "include" })
    if (res.status === 401 || res.status === 403) return null
    if (!res.ok) return null
    return res.json() as Promise<ApiUser>
  } catch {
    return null
  }
}

/**
 * Attempts shared-secret login. Spring Security form login redirects on
 * success/failure, so we verify by calling /api/user afterward.
 * Returns the user on success, null on failure.
 */
export async function loginSharedSecret(
  username: string,
  password = ""
): Promise<ApiUser | null> {
  try {
    const body = new URLSearchParams({ username, password })
    await fetch("/login/shared-secret", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "manual",
    })
    // Regardless of redirect status, check if we now have a valid session
    return getUser()
  } catch {
    return null
  }
}

/** POST to /logout and invalidate the session. */
export async function logoutUser(): Promise<void> {
  try {
    await fetch("/logout", {
      method: "POST",
      credentials: "include",
      redirect: "manual",
    })
  } catch {
    // ignore — session cookie will be cleared by browser anyway
  }
}

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
    duration: o.durationDays != null ? daysToMonths(o.durationDays) : 0,
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
    duration: l.durationDays ? daysToMonths(l.durationDays) : 0,
    purpose: l.purpose || "",
    status,
    fundedAt: l.fundedAt || l.dueDate,
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

/** Check if the backend is reachable at all (regardless of auth state). */
export async function isBackendReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/user`, { credentials: "include", method: "GET" })
    // 200 = authenticated, 401 = backend up but not authed — both mean reachable
    return res.status === 200 || res.status === 401
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

/** Create a loan offer (lender). Amount, interest rate, and duration (term) are the three parameters. */
export async function createLoanOffer(payload: {
  loanRequestId: string
  amount: number
  interestRate: number
  duration: number
}): Promise<LoanOffer> {
  const body: LoanOfferCreate = {
    loanRequestId: payload.loanRequestId,
    amount: payload.amount,
    interestRate: payload.interestRate,
    durationDays: monthsToDays(payload.duration),
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

// --- Token-based funding flow (lender -> borrower) ---

/** Borrower accepts offer with token settlement, creating a FundingIntent. */
export async function acceptOfferWithToken(
  offerContractId: string,
  creditProfileId: string,
): Promise<{ fundingIntentId: string }> {
  const body: AcceptOfferWithTokenRequest = { creditProfileId }
  return postApi<{ fundingIntentId: string }>(
    `/loans/offer/${encodeURIComponent(offerContractId)}:accept-with-token?commandId=${encodeURIComponent(commandId())}`,
    body
  )
}

/** Lender confirms a funding intent, creating a LoanPrincipalRequest. */
export async function confirmFundingIntent(
  intentContractId: string,
): Promise<{ principalRequestId: string }> {
  return postApi<{ principalRequestId: string }>(
    `/loans/funding-intent/${encodeURIComponent(intentContractId)}:confirm?commandId=${encodeURIComponent(commandId())}`
  )
}

/** List funding intents visible to the authenticated party. */
export async function listFundingIntents(): Promise<ApiFundingIntent[]> {
  try {
    return await fetchApi<ApiFundingIntent[]>("/loans/funding-intents")
  } catch {
    return []
  }
}

/** List loan principal requests (lender). */
export async function listPrincipalRequests(): Promise<ApiPrincipalRequest[]> {
  try {
    return await fetchApi<ApiPrincipalRequest[]>("/loans/principal-requests")
  } catch {
    return []
  }
}

/** Lender completes token funding for a principal request. */
export async function completeLoanFunding(
  principalRequestId: string,
  allocationContractId: string,
): Promise<{ loanId: string }> {
  const body: CompleteLoanFundingRequest = { allocationContractId }
  return postApi<{ loanId: string }>(
    `/loans/principal-requests/${encodeURIComponent(principalRequestId)}:complete-funding?commandId=${encodeURIComponent(commandId())}`,
    body
  )
}

// --- Token-based repayment flow (borrower -> lender) ---

/** Borrower requests token-based repayment, creating a LoanRepaymentRequest. */
export async function requestRepayment(
  loanContractId: string,
): Promise<{ repaymentRequestId: string }> {
  const body: RequestRepaymentRequest = {}
  return postApi<{ repaymentRequestId: string }>(
    `/loans/${encodeURIComponent(loanContractId)}:request-repayment?commandId=${encodeURIComponent(commandId())}`,
    body
  )
}

/** List loan repayment requests visible to the authenticated party. */
export async function listRepaymentRequests(): Promise<ApiRepaymentRequest[]> {
  try {
    return await fetchApi<ApiRepaymentRequest[]>("/loans/repayment-requests")
  } catch {
    return []
  }
}

/** Lender completes token-based repayment. */
export async function completeLoanRepayment(
  repaymentRequestId: string,
  allocationContractId: string,
): Promise<{ creditProfileId: string }> {
  const body: CompleteLoanRepaymentRequest = { allocationContractId }
  return postApi<{ creditProfileId: string }>(
    `/loans/repayment-requests/${encodeURIComponent(repaymentRequestId)}:complete-repayment?commandId=${encodeURIComponent(commandId())}`,
    body
  )
}

// --- Market Making / Order Book ---

function mapLenderBid(b: ApiLenderBid): LenderBid {
  return {
    id: b.contractId,
    contractId: b.contractId,
    lender: b.lender,
    amount: b.amount,
    remainingAmount: b.remainingAmount,
    minInterestRate: b.minInterestRate,
    maxDuration: daysToMonths(b.maxDuration),
    status: b.remainingAmount <= 0 ? "filled" : b.remainingAmount < b.amount ? "partial" : "active",
    createdAt: b.createdAt,
  }
}

function mapBorrowerAsk(a: ApiBorrowerAsk): BorrowerAsk {
  return {
    id: a.contractId,
    contractId: a.contractId,
    borrower: a.borrower,
    amount: a.amount,
    maxInterestRate: a.maxInterestRate,
    duration: daysToMonths(a.duration),
    status: "active",
    createdAt: a.createdAt,
  }
}

/** List active lender bids. */
export async function listLenderBids(): Promise<LenderBid[]> {
  try {
    const raw = await fetchApi<ApiLenderBid[]>("/market/lender-bids")
    return (raw || []).map(mapLenderBid)
  } catch {
    return []
  }
}

/** List active borrower asks. */
export async function listBorrowerAsks(): Promise<BorrowerAsk[]> {
  try {
    const raw = await fetchApi<ApiBorrowerAsk[]>("/market/borrower-asks")
    return (raw || []).map(mapBorrowerAsk)
  } catch {
    return []
  }
}

/** Create a lender bid. */
export async function createLenderBid(payload: {
  amount: number
  minInterestRate: number
  maxDuration: number
}): Promise<LenderBid> {
  const body: LenderBidCreate = {
    amount: payload.amount,
    minInterestRate: payload.minInterestRate,
    maxDuration: monthsToDays(payload.maxDuration),
  }
  const raw = await postApi<ApiLenderBid>(
    "/market/lender-bids?commandId=" + encodeURIComponent(commandId()),
    body
  )
  return mapLenderBid(raw)
}

/** Create a borrower ask. */
export async function createBorrowerAsk(payload: {
  amount: number
  maxInterestRate: number
  duration: number
  creditProfileId: string
}): Promise<BorrowerAsk> {
  const body: BorrowerAskCreate = {
    amount: payload.amount,
    maxInterestRate: payload.maxInterestRate,
    duration: monthsToDays(payload.duration),
    creditProfileId: payload.creditProfileId,
  }
  const raw = await postApi<ApiBorrowerAsk>(
    "/market/borrower-asks?commandId=" + encodeURIComponent(commandId()),
    body
  )
  return mapBorrowerAsk(raw)
}

/** Cancel a lender bid. */
export async function cancelLenderBid(contractId: string): Promise<void> {
  await fetchApi(`/market/lender-bids/${encodeURIComponent(contractId)}?commandId=${encodeURIComponent(commandId())}`, {
    method: "DELETE",
  })
}

/** Cancel a borrower ask. */
export async function cancelBorrowerAsk(contractId: string): Promise<void> {
  await fetchApi(`/market/borrower-asks/${encodeURIComponent(contractId)}?commandId=${encodeURIComponent(commandId())}`, {
    method: "DELETE",
  })
}

// --- Matched Loan Proposals ---

/** List matched loan proposals visible to the authenticated party. */
export async function listMatchedProposals(): Promise<ApiMatchedProposal[]> {
  try {
    return await fetchApi<ApiMatchedProposal[]>("/market/matched-proposals")
  } catch {
    return []
  }
}

/** Accept a matched loan proposal. */
export async function acceptMatchedProposal(contractId: string): Promise<{ loanId: string }> {
  return postApi<{ loanId: string }>(
    `/market/matched-proposals/${encodeURIComponent(contractId)}:accept?commandId=${encodeURIComponent(commandId())}`
  )
}

/** Reject/withdraw a matched loan proposal. */
export async function rejectMatchedProposal(contractId: string): Promise<void> {
  await postApi(
    `/market/matched-proposals/${encodeURIComponent(contractId)}:reject?commandId=${encodeURIComponent(commandId())}`
  )
}

// --- Order Book (aggregated from MarketMaker LenderBid/BorrowerAsk) ---

/** Fetch the aggregated order book (public endpoint, no auth required). */
export async function getOrderBook(): Promise<ApiOrderBookResponse | null> {
  try {
    return await fetchApi<ApiOrderBookResponse>("/orderbook")
  } catch {
    return null
  }
}
