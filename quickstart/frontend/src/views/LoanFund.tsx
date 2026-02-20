// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLoanStore } from '../stores/loanStore';

const LoanFundView: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { fundLoan, acceptOfferWithToken, creditProfile, fetchCreditProfile } = useLoanStore();
    const [offerContractId, setOfferContractId] = useState('');
    const [creditProfileId, setCreditProfileId] = useState('');
    const [description, setDescription] = useState('Token-based loan funding');
    const [prepareUntilDuration, setPrepareUntilDuration] = useState('PT2H');
    const [settleBeforeDuration, setSettleBeforeDuration] = useState('PT24H');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const mode = searchParams.get('mode') ?? 'now';
    const isTokenMode = mode === 'token';

    useEffect(() => {
        const offerId = searchParams.get('offerId');
        if (offerId) setOfferContractId(offerId);
    }, [searchParams]);

    useEffect(() => {
        fetchCreditProfile();
    }, [fetchCreditProfile]);

    useEffect(() => {
        if (creditProfile?.contractId && !creditProfileId) setCreditProfileId(creditProfile.contractId);
    }, [creditProfile?.contractId, creditProfileId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        const effectiveCreditProfileId = (creditProfileId || creditProfile?.contractId || '').trim();
        if (!offerContractId.trim() || !effectiveCreditProfileId) {
            setSubmitError('Please enter both offer contract ID and credit profile contract ID.');
            return;
        }
        setSubmitting(true);
        try {
            if (isTokenMode) {
                await acceptOfferWithToken(offerContractId.trim(), {
                    creditProfileId: effectiveCreditProfileId,
                    description: description.trim() || undefined,
                    prepareUntilDuration: prepareUntilDuration.trim() || undefined,
                    settleBeforeDuration: settleBeforeDuration.trim() || undefined,
                });
                navigate('/borrower');
            } else {
                await fundLoan(offerContractId.trim(), { creditProfileId: effectiveCreditProfileId });
                navigate('/borrower');
            }
        } catch (err: unknown) {
            const res = (err as { response?: { data?: { message?: string } | string } })?.response?.data;
            const msg = (typeof res === 'object' && res?.message) ? res.message
                : (typeof res === 'string' ? res : null)
                ?? (err as Error)?.message
                ?? 'Request failed. Check the console or try again.';
            setSubmitError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <h2>{isTokenMode ? 'Fund loan with token' : 'Fund loan (accept offer)'}</h2>
            <p className="text-muted">
                {isTokenMode
                    ? 'Create a token funding intent. The lender will confirm it and allocate in the wallet.'
                    : 'Accept a loan offer by providing the offer contract ID and your credit profile contract ID.'}
            </p>
            <form onSubmit={handleSubmit} className="card p-4">
                <div className="mb-3">
                    <label htmlFor="loan-fund-offer-id" className="form-label">Loan offer contract ID</label>
                    <input
                        id="loan-fund-offer-id"
                        name="offerContractId"
                        type="text"
                        className="form-control"
                        value={offerContractId}
                        onChange={(e) => setOfferContractId(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="loan-fund-credit-profile-id" className="form-label">Your credit profile contract ID</label>
                    <input
                        id="loan-fund-credit-profile-id"
                        name="creditProfileId"
                        type="text"
                        className="form-control"
                        value={creditProfileId || (creditProfile?.contractId ?? '')}
                        onChange={(e) => setCreditProfileId(e.target.value)}
                        placeholder={creditProfile?.contractId}
                        required
                    />
                    {creditProfile?.contractId && (
                        <small className="form-text text-muted">Pre-filled from your profile.</small>
                    )}
                </div>
                {isTokenMode && (
                    <>
                        <div className="mb-3">
                            <label htmlFor="loan-fund-description" className="form-label">Description</label>
                            <input
                                id="loan-fund-description"
                                name="description"
                                type="text"
                                className="form-control"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="loan-fund-prepare" className="form-label">Prepare window (ISO-8601 duration)</label>
                            <input
                                id="loan-fund-prepare"
                                name="prepareUntilDuration"
                                type="text"
                                className="form-control"
                                value={prepareUntilDuration}
                                onChange={(e) => setPrepareUntilDuration(e.target.value)}
                                placeholder="PT2H"
                            />
                            <small className="form-text text-muted">Example: PT2H (2 hours)</small>
                        </div>
                        <div className="mb-3">
                            <label htmlFor="loan-fund-settle" className="form-label">Settle window (ISO-8601 duration)</label>
                            <input
                                id="loan-fund-settle"
                                name="settleBeforeDuration"
                                type="text"
                                className="form-control"
                                value={settleBeforeDuration}
                                onChange={(e) => setSettleBeforeDuration(e.target.value)}
                                placeholder="PT24H"
                            />
                            <small className="form-text text-muted">Example: PT24H (24 hours)</small>
                        </div>
                    </>
                )}
                {submitError && (
                    <div className="alert alert-danger mb-3" role="alert">
                        {submitError}
                        {submitError.includes('no longer valid') && (
                            <p className="mb-0 mt-2 small">Go back to the <Link to="/borrower">Borrower dashboard</Link> and pick an offer from the list.</p>
                        )}
                    </div>
                )}
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Funding…' : (isTokenMode ? 'Create funding intent' : 'Fund loan')}
                </button>
            </form>
        </div>
    );
};

export default LoanFundView;
