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
  getPlatformStats,
  createLoanRequest as apiCreateLoanRequest,
  createLoanOffer as apiCreateLoanOffer,
  fundLoan as apiFundLoan,
  repayLoan as apiRepayLoan,
  markLoanDefault as apiMarkLoanDefault,
  createLenderBid as apiCreateLenderBid,
  createBorrowerAsk as apiCreateBorrowerAsk,
  cancelLenderBid as apiCancelLenderBid,
  cancelBorrowerAsk as apiCancelBorrowerAsk,
} from "@/lib/api"
import {
  mockLoanRequests,
  mockLoanOffers,
  mockActiveLoans,
  mockCreditProfile,
  mockLenderBids,
  mockBorrowerAsks,
  mockPlatformStats,
} from "@/lib/mock-data"

export type AuthStatus = "checking" | "authenticated" | "unauthenticated" | "no-backend"

export function useDenverData(role: "borrower" | "lender") {
  // Auth state
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking")
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null)

  // Data state — start with mocks so the UI is never blank
  const [requests, setRequests] = useState<LoanRequest[]>(mockLoanRequests)
  const [offers, setOffers] = useState<LoanOffer[]>(mockLoanOffers)
  const [loans, setLoans] = useState<ActiveLoan[]>(mockActiveLoans)
  const [creditProfile, setCreditProfile] = useState<CreditProfile | null>(mockCreditProfile)
  const [bids, setBids] = useState<LenderBid[]>(mockLenderBids)
  const [asks, setAsks] = useState<BorrowerAsk[]>(mockBorrowerAsks)
  const [platformStats, setPlatformStats] = useState(mockPlatformStats)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  const loadRealData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [reqs, offs, lns, profile, bidList, askList, stats] = await Promise.all([
        listLoanRequests(),
        listLoanOffers(),
        listLoans(),
        getCreditProfile(),
        listLenderBids(),
        listBorrowerAsks(),
        getPlatformStats(),
      ])
      setRequests(reqs)
      setOffers(offs)
      setLoans(lns)
      setCreditProfile(profile ?? mockCreditProfile)
      setBids(bidList.length > 0 ? bidList : mockLenderBids)
      setAsks(askList.length > 0 ? askList : mockBorrowerAsks)
      if (stats) setPlatformStats(stats)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [])

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
    // Reset to mock data so there's no flash of empty state on next login
    setRequests(mockLoanRequests)
    setOffers(mockLoanOffers)
    setLoans(mockActiveLoans)
    setCreditProfile(mockCreditProfile)
    setBids(mockLenderBids)
    setAsks(mockBorrowerAsks)
    setPlatformStats(mockPlatformStats)
  }, [])

  const refresh = useCallback(async () => {
    if (authStatus === "authenticated") await loadRealData()
  }, [authStatus, loadRealData])

  const createLoanRequest = useCallback(
    async (payload: { amount: number; interestRate: number; duration: number; purpose: string }) => {
      await apiCreateLoanRequest(payload)
      await loadRealData()
    },
    [loadRealData]
  )

  const createLoanOffer = useCallback(
    async (payload: { loanRequestId: string; amount: number; interestRate: number }) => {
      await apiCreateLoanOffer(payload)
      await loadRealData()
    },
    [loadRealData]
  )

  const fundLoan = useCallback(
    async (offerContractId: string, creditProfileId: string) => {
      await apiFundLoan(offerContractId, creditProfileId)
      await sleep(1500) // allow PQS to index the new Loan contract
      await loadRealData()
    },
    [loadRealData]
  )

  const repayLoan = useCallback(
    async (loanContractId: string) => {
      await apiRepayLoan(loanContractId)
      await sleep(1500)
      await loadRealData()
    },
    [loadRealData]
  )

  const markLoanDefault = useCallback(
    async (loanContractId: string) => {
      await apiMarkLoanDefault(loanContractId)
      await sleep(1500)
      await loadRealData()
    },
    [loadRealData]
  )

  const createLenderBid = useCallback(
    async (payload: { amount: number; minInterestRate: number; maxDuration: number }) => {
      if (!useApi) return
      await apiCreateLenderBid(payload)
      await refresh()
    },
    [useApi, refresh]
  )

  const createBorrowerAsk = useCallback(
    async (payload: { amount: number; maxInterestRate: number; duration: number; creditProfileId: string }) => {
      if (!useApi) return
      await apiCreateBorrowerAsk(payload)
      await refresh()
    },
    [useApi, refresh]
  )

  const cancelLenderBid = useCallback(
    async (contractId: string) => {
      if (!useApi) return
      await apiCancelLenderBid(contractId)
      await refresh()
    },
    [useApi, refresh]
  )

  const cancelBorrowerAsk = useCallback(
    async (contractId: string) => {
      if (!useApi) return
      await apiCancelBorrowerAsk(contractId)
      await refresh()
    },
    [useApi, refresh]
  )

  return {
    // Auth
    authStatus,
    currentUser,
    login,
    logout,
    // Data
    requests,
    offers,
    loans,
    creditProfile: creditProfile ?? mockCreditProfile,
    bids,
    asks,
    platformStats,
    loading,
    error,
    refresh,
    // Actions
    createLoanRequest,
    createLoanOffer,
    fundLoan,
    repayLoan,
    markLoanDefault,
    createLenderBid,
    createBorrowerAsk,
    cancelLenderBid,
    cancelBorrowerAsk,
  }
}
