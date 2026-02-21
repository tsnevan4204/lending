"use client"

import { useState, useEffect, useCallback } from "react"
import type {
  LoanRequest,
  LoanOffer,
  ActiveLoan,
  CreditProfile,
  LenderBid,
  BorrowerAsk,
} from "@/lib/mock-data"
import {
  type ApiUser,
  getUser,
  loginSharedSecret,
  logoutUser,
  isBackendReachable,
  listLoanRequests,
  listLoanOffers,
  listLoans,
  getCreditProfile,
  listLenderBids,
  listBorrowerAsks,
  getOrderBook,
  createLoanRequest as apiCreateLoanRequest,
  createLoanOffer as apiCreateLoanOffer,
  fundLoan as apiFundLoan,
  repayLoan as apiRepayLoan,
  markLoanDefault as apiMarkLoanDefault,
  createLenderBid as apiCreateLenderBid,
  createBorrowerAsk as apiCreateBorrowerAsk,
  cancelLenderBid as apiCancelLenderBid,
  cancelBorrowerAsk as apiCancelBorrowerAsk,
  acceptOfferWithToken as apiAcceptOfferWithToken,
  confirmFundingIntent as apiConfirmFundingIntent,
  listFundingIntents,
  listPrincipalRequests,
  completeLoanFunding as apiCompleteLoanFunding,
  requestRepayment as apiRequestRepayment,
  listRepaymentRequests,
  completeLoanRepayment as apiCompleteLoanRepayment,
  listMatchedProposals,
  acceptMatchedProposal as apiAcceptMatchedProposal,
  rejectMatchedProposal as apiRejectMatchedProposal,
} from "@/lib/api"
import type { ApiOrderBookResponse, ApiFundingIntent, ApiPrincipalRequest, ApiRepaymentRequest, ApiMatchedProposal } from "@/lib/api-types"
import {
  mockCreditProfile,
} from "@/lib/mock-data"

export type AuthStatus = "checking" | "authenticated" | "unauthenticated" | "no-backend"

export function useDenverData() {
  // Auth state
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking")
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null)

  // Data state
  const [requests, setRequests] = useState<LoanRequest[]>([])
  const [offers, setOffers] = useState<LoanOffer[]>([])
  const [loans, setLoans] = useState<ActiveLoan[]>([])
  const [creditProfile, setCreditProfile] = useState<CreditProfile | null>(mockCreditProfile)
  const [bids, setBids] = useState<LenderBid[]>([])
  const [asks, setAsks] = useState<BorrowerAsk[]>([])
  const [orderBook, setOrderBook] = useState<ApiOrderBookResponse | null>(null)
  const [fundingIntents, setFundingIntents] = useState<ApiFundingIntent[]>([])
  const [principalRequests, setPrincipalRequests] = useState<ApiPrincipalRequest[]>([])
  const [repaymentRequests, setRepaymentRequests] = useState<ApiRepaymentRequest[]>([])
  const [matchedProposals, setMatchedProposals] = useState<ApiMatchedProposal[]>([])
  const [walletUrl, setWalletUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  const loadRealData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [reqs, offs, lns, profile, bidList, askList, ob, intents, principals, repayReqs, proposals] = await Promise.all([
        listLoanRequests(),
        listLoanOffers(),
        listLoans(),
        getCreditProfile(),
        listLenderBids(),
        listBorrowerAsks(),
        getOrderBook(),
        listFundingIntents(),
        listPrincipalRequests(),
        listRepaymentRequests(),
        listMatchedProposals(),
      ])
      const reqById = new Map(reqs.map((r) => [r.id, r]))
      const enrichedOffers = offs.map((o) => {
        const req = reqById.get(o.loanRequestId)
        return req ? { ...o, duration: req.duration } : o
      })

      setRequests(reqs)
      setOffers(enrichedOffers)
      setLoans(lns)
      setCreditProfile(profile ?? mockCreditProfile)
      setBids(bidList)
      setAsks(askList)
      if (ob) setOrderBook(ob)
      setFundingIntents(intents)
      setPrincipalRequests(principals)
      setRepaymentRequests(repayReqs)
      setMatchedProposals(proposals)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshWithRetry = useCallback(
    async (attempts = 3, delayMs = 1000) => {
      for (let i = 0; i < attempts; i++) {
        await sleep(delayMs)
        await loadRealData()
      }
    },
    [loadRealData]
  )

  // On mount: check auth state
  useEffect(() => {
    let cancelled = false
    async function checkAuth() {
      const reachable = await isBackendReachable()
      if (cancelled) return
      if (!reachable) {
        setAuthStatus("no-backend")
        return
      }
      const user = await getUser()
      if (cancelled) return
      if (user) {
        setCurrentUser(user)
        setWalletUrl(user.walletUrl)
        setAuthStatus("authenticated")
      } else {
        setAuthStatus("unauthenticated")
      }
    }
    checkAuth()
    return () => { cancelled = true }
  }, [])

  // Load real data whenever we become authenticated
  useEffect(() => {
    if (authStatus === "authenticated") {
      loadRealData()
    }
  }, [authStatus, loadRealData])

  const login = useCallback(
    async (username: string, password = ""): Promise<boolean> => {
      const user = await loginSharedSecret(username, password)
      if (user) {
        setCurrentUser(user)
        setWalletUrl(user.walletUrl)
        setAuthStatus("authenticated")
        return true
      }
      return false
    },
    []
  )

  const logout = useCallback(async () => {
    await logoutUser()
    setCurrentUser(null)
    setAuthStatus("unauthenticated")
    setRequests([])
    setOffers([])
    setLoans([])
    setCreditProfile(null)
    setBids([])
    setAsks([])
  }, [])

  const refresh = useCallback(async () => {
    if (authStatus === "authenticated") await loadRealData()
  }, [authStatus, loadRealData])

  const createLoanRequest = useCallback(
    async (payload: { amount: number; interestRate: number; duration: number; purpose: string }) => {
      setError(null)
      try {
        await apiCreateLoanRequest(payload)

        let cpId = creditProfile?.contractId
        if (!cpId) {
          const freshProfile = await getCreditProfile()
          cpId = freshProfile?.contractId
        }
        if (cpId) {
          await apiCreateBorrowerAsk({
            amount: payload.amount,
            maxInterestRate: payload.interestRate,
            duration: payload.duration,
            creditProfileId: cpId,
          })
        }

        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create loan request")
        throw e
      }
    },
    [refreshWithRetry, creditProfile]
  )

  const createLoanOffer = useCallback(
    async (payload: { loanRequestId: string; amount: number; interestRate: number; duration: number }) => {
      setError(null)
      try {
        await apiCreateLoanOffer(payload)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create loan offer")
        throw e
      }
    },
    [refreshWithRetry]
  )

  const fundLoan = useCallback(
    async (offerContractId: string, creditProfileId: string) => {
      setError(null)
      try {
        await apiFundLoan(offerContractId, creditProfileId)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fund loan")
        throw e
      }
    },
    [refreshWithRetry]
  )

  const repayLoan = useCallback(
    async (loanContractId: string) => {
      setError(null)
      try {
        await apiRepayLoan(loanContractId)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to repay loan")
        throw e
      }
    },
    [refreshWithRetry]
  )

  const markLoanDefault = useCallback(
    async (loanContractId: string) => {
      setError(null)
      try {
        await apiMarkLoanDefault(loanContractId)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to mark loan as defaulted")
        throw e
      }
    },
    [refreshWithRetry]
  )

  const createLenderBid = useCallback(
    async (payload: { amount: number; minInterestRate: number; maxDuration: number }) => {
      setError(null)
      try {
        await apiCreateLenderBid(payload)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create lender bid")
        throw e
      }
    },
    [refreshWithRetry]
  )

  const createBorrowerAsk = useCallback(
    async (payload: { amount: number; maxInterestRate: number; duration: number; creditProfileId: string }) => {
      setError(null)
      try {
        await apiCreateBorrowerAsk(payload)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create borrower ask")
        throw e
      }
    },
    [refreshWithRetry]
  )

  const cancelLenderBid = useCallback(
    async (contractId: string) => {
      setError(null)
      try {
        await apiCancelLenderBid(contractId)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to cancel bid")
        throw e
      }
    },
    [refreshWithRetry]
  )

  const cancelBorrowerAsk = useCallback(
    async (contractId: string) => {
      setError(null)
      try {
        await apiCancelBorrowerAsk(contractId)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to cancel ask")
        throw e
      }
    },
    [refreshWithRetry]
  )

  // --- Matched Proposals ---

  const acceptProposal = useCallback(
    async (contractId: string) => {
      setError(null)
      try {
        await apiAcceptMatchedProposal(contractId)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to accept proposal")
        throw e
      }
    },
    [refreshWithRetry]
  )

  const rejectProposal = useCallback(
    async (contractId: string) => {
      setError(null)
      try {
        await apiRejectMatchedProposal(contractId)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to reject proposal")
        throw e
      }
    },
    [refreshWithRetry]
  )

  // --- Token-based funding (lender -> borrower) ---

  const acceptOfferWithToken = useCallback(
    async (offerContractId: string, creditProfileId: string) => {
      setError(null)
      try {
        await apiAcceptOfferWithToken(offerContractId, creditProfileId)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to accept offer with token")
        throw e
      }
    },
    [refreshWithRetry]
  )

  const confirmFundingIntent = useCallback(
    async (intentContractId: string) => {
      setError(null)
      try {
        await apiConfirmFundingIntent(intentContractId)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to confirm funding intent")
        throw e
      }
    },
    [refreshWithRetry]
  )

  const completeFunding = useCallback(
    async (principalRequestId: string, allocationContractId: string) => {
      setError(null)
      try {
        await apiCompleteLoanFunding(principalRequestId, allocationContractId)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to complete funding")
        throw e
      }
    },
    [refreshWithRetry]
  )

  // --- Token-based repayment (borrower -> lender) ---

  const requestRepayment = useCallback(
    async (loanContractId: string) => {
      setError(null)
      try {
        await apiRequestRepayment(loanContractId)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to request repayment")
        throw e
      }
    },
    [refreshWithRetry]
  )

  const completeRepayment = useCallback(
    async (repaymentRequestId: string, allocationContractId: string) => {
      setError(null)
      try {
        await apiCompleteLoanRepayment(repaymentRequestId, allocationContractId)
        await refreshWithRetry(2, 1500)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to complete repayment")
        throw e
      }
    },
    [refreshWithRetry]
  )

  return {
    // Auth
    authStatus,
    currentUser,
    walletUrl,
    login,
    logout,
    // Data
    requests,
    offers,
    loans,
    creditProfile: creditProfile ?? mockCreditProfile,
    bids,
    asks,
    orderBook,
    fundingIntents,
    principalRequests,
    repaymentRequests,
    matchedProposals,
    loading,
    error,
    clearError: () => setError(null),
    refresh,
    // Simple actions (kept for backward compat)
    createLoanRequest,
    createLoanOffer,
    fundLoan,
    repayLoan,
    markLoanDefault,
    createLenderBid,
    createBorrowerAsk,
    cancelLenderBid,
    cancelBorrowerAsk,
    // Matched proposals
    acceptProposal,
    rejectProposal,
    // Token-based actions
    acceptOfferWithToken,
    confirmFundingIntent,
    completeFunding,
    requestRepayment,
    completeRepayment,
  }
}
