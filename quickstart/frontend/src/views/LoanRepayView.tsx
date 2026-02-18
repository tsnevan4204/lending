// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLoanStore } from '../stores/loanStore';
import { formatDateTime } from '../utils/format';

const LoanRepayPage: React.FC = () => {
    const { contractId } = useParams<{ contractId: string }>();
    const navigate = useNavigate();
    const { loans, fetchLoans, repayLoan } = useLoanStore();
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchLoans();
    }, [fetchLoans]);

    const loan = contractId ? loans.find((l) => l.contractId === decodeURIComponent(contractId)) : null;

    const handleRepay = async () => {
        if (!loan?.contractId) return;
        setSubmitting(true);
        try {
            await repayLoan(loan.contractId);
            navigate('/borrower');
        } finally {
            setSubmitting(false);
        }
    };

    if (!contractId) return <div><h2>Repay loan</h2><p>No loan specified.</p></div>;
    if (!loan) return <div><h2>Repay loan</h2><p>Loading or loan not found.</p></div>;
    if (loan.status !== 'Active') return <div><h2>Repay loan</h2><p>This loan is not active (status: {loan.status}).</p></div>;

    return (
        <div>
            <h2>Repay loan</h2>
            <div className="card p-4 mb-4">
                <p><strong>Principal:</strong> {loan.principal}</p>
                <p><strong>Interest rate:</strong> {loan.interestRate}%</p>
                <p><strong>Due date:</strong> {formatDateTime(loan.dueDate)}</p>
                <p className="text-muted">Repayment will archive the loan and update your credit profile.</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleRepay} disabled={submitting}>
                {submitting ? 'Repaying…' : 'Repay loan'}
            </button>
        </div>
    );
};

export default LoanRepayPage;
