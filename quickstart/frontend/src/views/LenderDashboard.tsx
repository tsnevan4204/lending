// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLoanStore } from '../stores/loanStore';
import { useUserStore } from '../stores/userStore';
import { formatDateTime } from '../utils/format';

const LenderDashboard: React.FC = () => {
    const { user } = useUserStore();
    const { loans, loanOffers, loanRequests, fetchLoans, fetchLoanOffers, fetchLoanRequests } = useLoanStore();
    const currentParty = user?.party ?? '';

    useEffect(() => {
        fetchLoans();
        fetchLoanOffers();
        fetchLoanRequests();
    }, [fetchLoans, fetchLoanOffers, fetchLoanRequests]);

    // Refetch periodically so new offers/loans show up after PQS indexing.
    useEffect(() => {
        const interval = setInterval(() => {
            fetchLoans();
            fetchLoanOffers();
            fetchLoanRequests();
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchLoans, fetchLoanOffers, fetchLoanRequests]);

    const myLoans = loans.filter((l) => l.status === 'Active' || l.status === 'Repaid');
    const party = (currentParty || '').trim();
    const offersIMade = party ? loanOffers.filter((o) => (o.lender || '').trim() === party) : [];
    const offersToMe = party ? loanOffers.filter((o) => (o.borrower || '').trim() === party) : [];

    // Exclude requests we already made an offer on (so they disappear from "Loan requests to fund").
    // Offers store the underlying LoanRequest id; disclosed rows have underlyingRequestContractId set.
    const requestIdsIOffered = new Set(
        offersIMade.map((o) => o.loanRequestId).filter((id): id is string => id != null)
    );
    const requestsToFund = loanRequests.filter((r) => {
        if ((r.borrower || '').trim() === party) return false;
        const matchId = r.underlyingRequestContractId ?? r.contractId;
        return !requestIdsIOffered.has(matchId);
    });

    return (
        <div>
            <h2>Lender Dashboard</h2>
            <p className="text-muted">Browse loan requests below and make offers to fund borrowers.</p>
            <section className="card mb-4">
                <h3>Loan requests to fund</h3>
                <p className="text-muted small mb-2">Live loan requests from borrowers disclosed to you. Each row is an on-chain contract.</p>
                {requestsToFund.length === 0 ? (
                    <p>No loan requests available. When borrowers request loans, they will appear here.</p>
                ) : (
                    <ul className="list-group">
                        {requestsToFund.map((req) => (
                                <li key={req.contractId} className="list-group-item d-flex justify-content-between align-items-center">
                                    <span>{req.amount} from {req.borrower} @ {req.interestRate}% — {req.durationDays} days — {req.purpose || '—'}</span>
                                    <Link to={'/loans/offer?requestId=' + encodeURIComponent(req.contractId)} className="btn btn-sm btn-primary">Make offer</Link>
                                </li>
                            ))}
                    </ul>
                )}
            </section>
            <section className="card mb-4">
                <h3>Offers you made</h3>
                {offersIMade.length === 0 ? (
                    <p>No offers yet.</p>
                ) : (
                    <ul className="list-group">
                        {offersIMade.map((offer) => (
                            <li key={offer.contractId} className="list-group-item">
                                {offer.amount} to {offer.borrower} @ {offer.interestRate}% — {offer.createdAt ? formatDateTime(offer.createdAt) : ''} — <span className="badge bg-info">Waiting for borrower to fund</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            {offersToMe.length > 0 && (
                <section className="card mb-4">
                    <h3>Offers made to you</h3>
                    <ul className="list-group">
                        {offersToMe.map((offer) => (
                            <li key={offer.contractId} className="list-group-item d-flex justify-content-between align-items-center">
                                <span>{offer.amount} from {offer.lender} @ {offer.interestRate}%</span>
                                <Link to={'/loans/fund?offerId=' + encodeURIComponent(offer.contractId)} className="btn btn-sm btn-primary">Accept &amp; fund</Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
            <section className="card mb-4">
                <h3>Funded loans</h3>
                {myLoans.length === 0 ? (
                    <p>No loans yet.</p>
                ) : (
                    <ul className="list-group">
                        {myLoans.map((loan) => (
                            <li key={loan.contractId} className="list-group-item">
                                <strong>{loan.principal}</strong> to {loan.borrower} @ {loan.interestRate}% — due {formatDateTime(loan.dueDate)} — <span className="badge bg-secondary">{loan.status}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
};

export default LenderDashboard;
