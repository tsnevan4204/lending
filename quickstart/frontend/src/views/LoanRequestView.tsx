// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoanStore } from '../stores/loanStore';
import type { LoanRequestCreate } from '../openapi.d.ts';

const LoanRequestPage: React.FC = () => {
    const navigate = useNavigate();
    const { createLoanRequest } = useLoanStore();
    const [amount, setAmount] = useState('100');
    const [interestRate, setInterestRate] = useState('5');
    const [durationDays, setDurationDays] = useState('30');
    const [purpose, setPurpose] = useState('');
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const body: LoanRequestCreate = {
            amount: parseFloat(amount) || 0,
            interestRate: parseFloat(interestRate) || 0,
            durationDays: parseInt(durationDays, 10) || 30,
            purpose: purpose || 'General',
        };
        await createLoanRequest(body);
        navigate('/borrower');
    };
    return (
        <div>
            <h2>Request a loan</h2>
            <form onSubmit={handleSubmit} className="card p-4">
                <div className="mb-3">
                    <label className="form-label">Amount</label>
                    <input type="number" className="form-control" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" min="0" required />
                </div>
                <div className="mb-3">
                    <label className="form-label">Interest rate (%)</label>
                    <input type="number" className="form-control" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} step="0.01" min="0" required />
                </div>
                <div className="mb-3">
                    <label className="form-label">Duration (days)</label>
                    <input type="number" className="form-control" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} min="1" required />
                </div>
                <div className="mb-3">
                    <label className="form-label">Purpose</label>
                    <input type="text" className="form-control" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. General" />
                </div>
                <button type="submit" className="btn btn-primary">Submit request</button>
            </form>
        </div>
    );
};
export default LoanRequestPage;
