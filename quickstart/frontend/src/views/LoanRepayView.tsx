// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLoanStore } from '../stores/loanStore';
import { formatDateTime } from '../utils/format';

const LoanRepayPage: React.FC = () => {
    const { contractId } = useParams<{ contractId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { loans, fetchLoans, repayLoan, requestRepayment } = useLoanStore();
    const [submitting, setSubmitting] = useState(false);
    const [description, setDescription] = useState('Token-based loan repayment');
    const [prepareUntilDuration, setPrepareUntilDuration] = useState('PT2H');
    const [settleBeforeDuration, setSettleBeforeDuration] = useState('PT24H');
    const mode = searchParams.get('mode') ?? 'now';
    const isTokenMode = mode === 'token';

    useEffect(() => {
        fetchLoans();
    }, [fetchLoans]);

    const loan = contractId ? loans.find((l) => l.contractId === decodeURIComponent(contractId)) : null;

    const handleRepay = async () => {
        if (!loan?.contractId) return;
        setSubmitting(true);
        try {
            if (isTokenMode) {
                await requestRepayment(loan.contractId, {
                    description: description.trim() || undefined,
                    prepareUntilDuration: prepareUntilDuration.trim() || undefined,
                    settleBeforeDuration: settleBeforeDuration.trim() || undefined,
                });
                navigate('/borrower');
            } else {
                await repayLoan(loan.contractId);
                navigate('/borrower');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!contractId) return <div><h2>Repay loan</h2><p>No loan specified.</p></div>;
    if (!loan) return <div><h2>Repay loan</h2><p>Loading or loan not found.</p></div>;
    if (loan.status !== 'Active') return <div><h2>Repay loan</h2><p>This loan is not active (status: {loan.status}).</p></div>;

    return (
        <div>
            <h2>{isTokenMode ? 'Repay loan with token' : 'Repay loan'}</h2>
            <div className="card p-4 mb-4">
                <p><strong>Principal:</strong> {loan.principal}</p>
                <p><strong>Interest rate:</strong> {loan.interestRate}%</p>
                <p><strong>Due date:</strong> {formatDateTime(loan.dueDate)}</p>
                <p className="text-muted">
                    {isTokenMode
                        ? 'Create a token repayment request. Lender will allocate and complete the repayment.'
                        : 'Repayment will archive the loan and update your credit profile.'}
                </p>
            </div>
            {isTokenMode && (
                <div className="card p-4 mb-4">
                    <div className="mb-3">
                        <label htmlFor="repay-description" className="form-label">Description</label>
                        <input
                            id="repay-description"
                            type="text"
                            className="form-control"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="repay-prepare" className="form-label">Prepare window (ISO-8601 duration)</label>
                        <input
                            id="repay-prepare"
                            type="text"
                            className="form-control"
                            value={prepareUntilDuration}
                            onChange={(e) => setPrepareUntilDuration(e.target.value)}
                            placeholder="PT2H"
                        />
                        <small className="form-text text-muted">Example: PT2H (2 hours)</small>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="repay-settle" className="form-label">Settle window (ISO-8601 duration)</label>
                        <input
                            id="repay-settle"
                            type="text"
                            className="form-control"
                            value={settleBeforeDuration}
                            onChange={(e) => setSettleBeforeDuration(e.target.value)}
                            placeholder="PT24H"
                        />
                        <small className="form-text text-muted">Example: PT24H (24 hours)</small>
                    </div>
                </div>
            )}
            <button type="button" className="btn btn-primary" onClick={handleRepay} disabled={submitting}>
                {submitting ? 'Repaying…' : (isTokenMode ? 'Request token repayment' : 'Repay loan')}
            </button>
        </div>
    );
};

export default LoanRepayPage;
