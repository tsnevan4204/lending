// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLoanStore } from '../stores/loanStore';
import { useUserStore } from '../stores/userStore';
import { formatDateTime } from '../utils/format';

const BorrowerDashboard: React.FC = () => {
    const { user } = useUserStore();
    const currentParty = user?.party ?? '';
    const { loans, loanOffers, creditProfile, fetchLoans, fetchLoanOffers, fetchCreditProfile } = useLoanStore();
    useEffect(() => {
        fetchCreditProfile();
        fetchLoans();
        fetchLoanOffers();
    }, [fetchCreditProfile, fetchLoans, fetchLoanOffers]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchLoans();
            fetchCreditProfile();
            fetchLoanOffers();
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchLoans, fetchCreditProfile, fetchLoanOffers]);
    const activeLoans = loans.filter((l) => l.status === 'Active');
    const offersToAccept = currentParty ? loanOffers.filter((o) => (o.borrower || '').trim() === (currentParty || '').trim()) : [];
    return (
        <div>
            <h2>Borrower Dashboard</h2>
            {currentParty && (
                <p className="small text-secondary mb-2">Logged in as party: <strong>{currentParty}</strong></p>
            )}
            <section className="card mb-4">
                <h3>Credit Profile</h3>
                {creditProfile ? (
                    <div>
                        <p><strong>Credit score:</strong> {creditProfile.creditScore}</p>
                        <p><strong>Total loans:</strong> {creditProfile.totalLoans}</p>
                        <p><strong>Successful:</strong> {creditProfile.successfulLoans} &middot; <strong>Defaulted:</strong> {creditProfile.defaultedLoans}</p>
                    </div>
                ) : (
                    <p>Loading or no profile yet. Request a loan to create one.</p>
                )}
            </section>
            <section className="card mb-4">
                <h3>Offers you can accept</h3>
                {offersToAccept.length > 0 ? (
                    <ul className="list-group">
                        {offersToAccept.map((offer) => (
                            <li key={offer.contractId} className="list-group-item d-flex justify-content-between align-items-center">
                                <span>{offer.amount} @ {offer.interestRate}% from {offer.lender}</span>
                                <div className="d-flex gap-2">
                                    <Link to={`/loans/fund?offerId=${encodeURIComponent(offer.contractId)}`} className="btn btn-sm btn-primary">Accept &amp; fund</Link>
                                    <Link to={`/loans/fund?offerId=${encodeURIComponent(offer.contractId)}&mode=token`} className="btn btn-sm btn-outline-primary">Fund with token</Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mb-2">No offers addressed to you right now. When a lender makes an offer on your loan request, it will appear here.</p>
                )}
                <p className="small text-muted mb-0"><Link to="/loans/fund">Accept by offer ID</Link> (if you have an offer contract ID)</p>
            </section>
            <section className="card mb-4">
                <h3>Active loans</h3>
                {activeLoans.length === 0 ? (
                    <p>No active loans.</p>
                ) : (
                    <ul className="list-group">
                        {activeLoans.map((loan) => (
                            <li key={loan.contractId} className="list-group-item d-flex justify-content-between align-items-center">
                                <span>{loan.principal} @ {loan.interestRate}% — due {formatDateTime(loan.dueDate)}</span>
                                <div className="d-flex gap-2">
                                    <Link to={'/loans/repay/' + encodeURIComponent(loan.contractId)} className="btn btn-sm btn-primary">Repay</Link>
                                    <Link to={`/loans/repay/${encodeURIComponent(loan.contractId)}?mode=token`} className="btn btn-sm btn-outline-primary">Repay with token</Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            <p><Link to="/loans/request" className="btn btn-primary">Request Loan</Link></p>
        </div>
    );
};
export default BorrowerDashboard;
