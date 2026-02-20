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
  isApiAvailable,
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

export function useDenverData(role: "borrower" | "lender") {
  const [useApi, setUseApi] = useState<boolean | null>(null)
  const [requests, setRequests] = useState<LoanRequest[]>(mockLoanRequests)
  const [offers, setOffers] = useState<LoanOffer[]>(mockLoanOffers)
  const [loans, setLoans] = useState<ActiveLoan[]>(mockActiveLoans)
  const [creditProfile, setCreditProfile] = useState<CreditProfile | null>(mockCreditProfile)
  const [bids, setBids] = useState<LenderBid[]>(mockLenderBids)
  const [asks, setAsks] = useState<BorrowerAsk[]>(mockBorrowerAsks)
  const [platformStats, setPlatformStats] = useState(mockPlatformStats)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (useApi === false) {
      setRequests(mockLoanRequests)
      setOffers(mockLoanOffers)
      setLoans(mockActiveLoans)
      setCreditProfile(mockCreditProfile)
      setBids(mockLenderBids)
      setAsks(mockBorrowerAsks)
      setPlatformStats(mockPlatformStats)
      setLoading(false)
      return
    }
    if (!useApi) return
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
      setRequests(mockLoanRequests)
      setOffers(mockLoanOffers)
      setLoans(mockActiveLoans)
      setCreditProfile(mockCreditProfile)
      setBids(mockLenderBids)
      setAsks(mockBorrowerAsks)
      setPlatformStats(mockPlatformStats)
    } finally {
      setLoading(false)
    }
  }, [useApi])

  useEffect(() => {
    let cancelled = false
    isApiAvailable().then((ok) => {
      if (!cancelled) setUseApi(ok)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (useApi === false) {
      setRequests(mockLoanRequests)
      setOffers(mockLoanOffers)
      setLoans(mockActiveLoans)
      setCreditProfile(mockCreditProfile)
      setBids(mockLenderBids)
      setAsks(mockBorrowerAsks)
      setPlatformStats(mockPlatformStats)
      setLoading(false)
      return
    }
    if (useApi === true) refresh()
  }, [useApi, refresh])

  const createLoanRequest = useCallback(
    async (payload: { amount: number; interestRate: number; duration: number; purpose: string }) => {
      if (!useApi) return
      await apiCreateLoanRequest(payload)
      await refresh()
    },
    [useApi, refresh]
  )

  const createLoanOffer = useCallback(
    async (payload: { loanRequestId: string; amount: number; interestRate: number }) => {
      if (!useApi) return
      await apiCreateLoanOffer(payload)
      await refresh()
    },
    [useApi, refresh]
  )

  const fundLoan = useCallback(
    async (offerContractId: string, creditProfileId: string) => {
      if (!useApi) return
      await apiFundLoan(offerContractId, creditProfileId)
      await refresh()
    },
    [useApi, refresh]
  )

  const repayLoan = useCallback(
    async (loanContractId: string) => {
      if (!useApi) return
      await apiRepayLoan(loanContractId)
      await refresh()
    },
    [useApi, refresh]
  )

  const markLoanDefault = useCallback(
    async (loanContractId: string) => {
      if (!useApi) return
      await apiMarkLoanDefault(loanContractId)
      await refresh()
    },
    [useApi, refresh]
  )

  return {
    requests,
    offers,
    loans,
    creditProfile: creditProfile ?? mockCreditProfile,
    bids,
    asks,
    platformStats,
    loading,
    error,
    useApi: useApi ?? false,
    refresh,
    createLoanRequest,
    createLoanOffer,
    fundLoan,
    repayLoan,
    markLoanDefault,
  }
}
