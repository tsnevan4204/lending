// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useLoanStore } from '../stores/loanStore';
import type { LoanOfferCreate } from '../openapi.d.ts';

const LoanOfferView: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const requestId = searchParams.get('requestId') ?? '';
    const { loanRequests, fetchLoanRequests, createLoanOffer } = useLoanStore();
    const [amount, setAmount] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const request = loanRequests.find((r) => r.contractId === requestId);

    useEffect(() => {
        if (requestId) fetchLoanRequests();
    }, [requestId, fetchLoanRequests]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        if (!requestId.trim()) {
            setSubmitError('Missing loan request ID');
            return;
        }
        const amountNum = parseFloat(amount) || (request?.amount ?? 0);
        const rateNum = parseFloat(interestRate) || (request?.interestRate ?? 0);
        if (amountNum <= 0) {
            setSubmitError('Amount must be greater than 0');
            return;
        }
        setSubmitting(true);
        const body: LoanOfferCreate = {
            loanRequestId: requestId.trim(),
            amount: amountNum,
            interestRate: rateNum,
        };
        console.log('[LoanOfferView] createLoanOffer requestId=', requestId.trim(), 'body=', JSON.stringify(body));
        try {
            await createLoanOffer(body);
            navigate('/lender');
        } catch (err) {
            const msg = (err as { response?: { data?: { message?: string }; status?: number } })?.response?.data?.message
                ?? (err as Error)?.message
                ?? 'Offer failed';
            setSubmitError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (!requestId) {
        return (
            <div>
                <h2>Make a loan offer</h2>
                <p>Select a loan request from the <Link to="/lender">Lender dashboard</Link> to make an offer.</p>
            </div>
        );
    }

    const effectiveAmount = amount || (request?.amount?.toString() ?? '');
    const effectiveRate = interestRate || (request?.interestRate?.toString() ?? '');

    return (
        <div>
            <h2>Make a loan offer</h2>
            {request && (
                <p className="text-muted mb-3">
                    Borrower: {request.borrower} — requested <strong>{request.amount} @ {request.interestRate}%</strong> for {request.durationDays} days. You can offer the same terms (recommended) or change them below.
                </p>
            )}
            {submitError && (
                <div className="alert alert-danger mb-3" role="alert">{submitError}</div>
            )}
            <form onSubmit={handleSubmit} className="card p-4">
                <div className="mb-3">
                    <label className="form-label">Amount to offer</label>
                    <input
                        type="number"
                        className="form-control"
                        value={effectiveAmount}
                        onChange={(e) => setAmount(e.target.value)}
                        step="0.01"
                        min="0"
                        required
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Interest rate (%)</label>
                    <input
                        type="number"
                        className="form-control"
                        value={effectiveRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        step="0.01"
                        min="0"
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Submitting…' : request ? 'Make offer at these terms' : 'Submit offer'}
                </button>
                <Link to="/lender" className="btn btn-outline-secondary ms-2">Cancel</Link>
            </form>
        </div>
    );
};

export default LoanOfferView;
