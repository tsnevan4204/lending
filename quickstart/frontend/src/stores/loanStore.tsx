// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useToast } from './toastStore';
import api from '../api';
import { generateCommandId } from '../utils/commandId';
import type {
    Client,
    CreditProfile,
    Loan,
    LoanOffer,
    LoanRequest,
    LoanRequestCreate,
    LoanOfferCreate,
    LoanFundRequest,
    LoanFundResult,
} from '../openapi.d.ts';
import { withErrorHandling } from '../utils/error';

interface LoanState {
    loans: Loan[];
    loanOffers: LoanOffer[];
    loanRequests: LoanRequest[];
    creditProfile: CreditProfile | null;
}

interface LoanContextType extends LoanState {
    fetchLoans: () => Promise<void>;
    fetchLoanOffers: () => Promise<void>;
    fetchLoanRequests: () => Promise<void>;
    fetchCreditProfile: () => Promise<void>;
    createLoanRequest: (body: LoanRequestCreate) => Promise<void>;
    createLoanOffer: (body: LoanOfferCreate) => Promise<void>;
    fundLoan: (offerContractId: string, body: LoanFundRequest) => Promise<LoanFundResult | void>;
    repayLoan: (loanContractId: string) => Promise<void>;
}

const LoanContext = createContext<LoanContextType | undefined>(undefined);

export const LoanProvider = ({ children }: { children: React.ReactNode }) => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loanOffers, setLoanOffers] = useState<LoanOffer[]>([]);
    const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([]);
    const [creditProfile, setCreditProfile] = useState<CreditProfile | null>(null);
    const toast = useToast();

    const fetchLoans = useCallback(
        withErrorHandling('Fetching loans')(async () => {
            const client: Client = await api.getClient();
            const response = await client.listLoans();
            const list = response.data ?? [];
            setLoans(list);
        }),
        []
    );

    const fetchLoanOffers = useCallback(
        withErrorHandling('Fetching loan offers')(async () => {
            const client: Client = await api.getClient();
            const response = await client.listLoanOffers();
            const list = response.data ?? [];
            console.log('[loanStore] fetchLoanOffers count=', list.length, 'offers=', list.map((o: LoanOffer) => ({ contractId: o.contractId, lender: o.lender, amount: o.amount })));
            setLoanOffers(list);
        }),
        []
    );

    const fetchLoanRequests = useCallback(
        withErrorHandling('Fetching loan requests')(async () => {
            const client: Client = await api.getClient();
            const response = await client.listLoanRequests();
            const list = response.data ?? [];
            setLoanRequests(list);
        }),
        []
    );

    const fetchCreditProfile = useCallback(
        withErrorHandling('Fetching credit profile')(async () => {
            const client: Client = await api.getClient();
            try {
                const response = await client.getCreditProfile();
                setCreditProfile(response.data ?? null);
            } catch (err: unknown) {
                const status = (err as { response?: { status?: number } })?.response?.status;
                if (status === 404) {
                    console.debug('[loanStore] getCreditProfile 404 – no profile yet (treating as empty)');
                    setCreditProfile(null);
                    return;
                }
                throw err;
            }
        }),
        []
    );

    const createLoanRequest = useCallback(
        withErrorHandling('Creating loan request')(async (body: LoanRequestCreate) => {
            console.log('[loanStore] createLoanRequest CALL body=', JSON.stringify(body));
            const client: Client = await api.getClient();
            const commandId = generateCommandId();
            try {
                const res = await client.createLoanRequest({ commandId }, body);
                console.log('[loanStore] createLoanRequest SUCCESS status=', res.status, 'data=', res.data);
                toast.displaySuccess('Loan request created');
                await fetchLoans();
            } catch (err) {
                console.error('[loanStore] createLoanRequest FAILED', err);
                throw err;
            }
        }),
        [toast, fetchLoans]
    );

    const createLoanOffer = useCallback(
        withErrorHandling('Creating loan offer')(async (body: LoanOfferCreate) => {
            console.log('[loanStore] createLoanOffer CALL body=', JSON.stringify(body));
            const client: Client = await api.getClient();
            const commandId = generateCommandId();
            try {
                const res = await client.createLoanOffer({ commandId }, body);
                console.log('[loanStore] createLoanOffer SUCCESS status=', res.status, 'data=', res.data);
                toast.displaySuccess('Loan offer created');
                await Promise.all([fetchLoans(), fetchLoanOffers(), fetchLoanRequests()]);
                // Refetch again after short delay so PQS indexing shows the new offer.
                setTimeout(() => {
                    void Promise.all([fetchLoans(), fetchLoanOffers(), fetchLoanRequests()]);
                }, 2000);
            } catch (err) {
                console.error('[loanStore] createLoanOffer FAILED', err);
                throw err;
            }
        }),
        [toast, fetchLoans, fetchLoanOffers, fetchLoanRequests]
    );

    const fundLoan = useCallback(
        withErrorHandling('Funding loan')(async (offerContractId: string, body: LoanFundRequest) => {
            const client: Client = await api.getClient();
            const commandId = generateCommandId();
            const response = await client.fundLoan({ contractId: offerContractId, commandId }, body);
            toast.displaySuccess('Loan funded');
            await Promise.all([fetchLoans(), fetchLoanOffers(), fetchCreditProfile()]);
            // Refetch after delay so PQS indexing shows the new loan.
            setTimeout(() => {
                void Promise.all([fetchLoans(), fetchLoanOffers(), fetchCreditProfile()]);
            }, 2000);
            return response.data;
        }),
        [toast, fetchLoans, fetchLoanOffers, fetchCreditProfile]
    );

    const repayLoan = useCallback(
        withErrorHandling('Repaying loan')(async (loanContractId: string) => {
            const client: Client = await api.getClient();
            const commandId = generateCommandId();
            await client.repayLoan({ contractId: loanContractId, commandId });
            toast.displaySuccess('Loan repaid');
            await fetchLoans();
            await fetchCreditProfile();
        }),
        [toast, fetchLoans, fetchCreditProfile]
    );

    const value: LoanContextType = {
        loans,
        loanOffers,
        loanRequests,
        creditProfile,
        fetchLoans,
        fetchLoanOffers,
        fetchLoanRequests,
        fetchCreditProfile,
        createLoanRequest,
        createLoanOffer,
        fundLoan,
        repayLoan,
    };

    return <LoanContext.Provider value={value}>{children}</LoanContext.Provider>;
};

export const useLoanStore = () => {
    const ctx = useContext(LoanContext);
    if (ctx === undefined) {
        throw new Error('useLoanStore must be used within LoanProvider');
    }
    return ctx;
};
