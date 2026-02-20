// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect } from 'react';
import { useUserStore } from '../stores/userStore';
import { useNavigate } from 'react-router-dom';

const HomeView: React.FC = () => {
    const { user, loading } = useUserStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user === null) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    if (loading) {
        return null;
    }

    return (
        <main>
            <h1>Denver Lending</h1>
            <p className="text-muted">Welcome to the decentralized microlending platform. Use the navigation above to access the Borrower or Lender dashboard.</p>
        </main>
    );
};

export default HomeView;
