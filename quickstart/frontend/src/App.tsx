// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './stores/toastStore';
import HomeView from './views/HomeView';
import TenantRegistrationView from './views/TenantRegistrationView.tsx';
import LoginView from './views/LoginView';
import { UserProvider } from './stores/userStore';
import Header from './components/Header';
import ToastNotification from './components/ToastNotification';
import AppInstallsView from "./views/AppInstallsView.tsx";
import LicensesView from './views/LicensesView';
import { LicenseProvider } from './stores/licenseStore';
import { AppInstallProvider } from "./stores/appInstallStore.tsx";
import { TenantRegistrationProvider } from "./stores/tenantRegistrationStore.tsx";
import { LoanProvider } from './stores/loanStore';
import BorrowerDashboard from './views/BorrowerDashboard';
import LenderDashboard from './views/LenderDashboard';
import LoanRequestPage from './views/LoanRequestView';
import LoanRepayPage from './views/LoanRepayView';
import LoanFundView from './views/LoanFund';
import LoanOfferView from './views/LoanOfferView';

const App: React.FC = () => {
    const AppProviders = composeProviders(
        ToastProvider,
        UserProvider,
        TenantRegistrationProvider,
        AppInstallProvider,
        LicenseProvider,
        LoanProvider
    );

    return (
        <AppProviders>
            <Header />
            <main className="container mt-4">
                <Routes>
                    <Route path="/" element={<HomeView />} />
                    <Route path="/tenants" element={<TenantRegistrationView />} />
                    <Route path="/login" element={<LoginView />} />
                    <Route path="/app-installs" element={<AppInstallsView />} />
                    <Route path="/licenses" element={<LicensesView />} />
                    <Route path="/borrower" element={<BorrowerDashboard />} />
                    <Route path="/lender" element={<LenderDashboard />} />
                    <Route path="/loans/request" element={<LoanRequestPage />} />
                    <Route path="/loans/offer" element={<LoanOfferView />} />
                    <Route path="/loans/repay/:contractId" element={<LoanRepayPage />} />
                    <Route path="/loans/fund" element={<LoanFundView />} />
                </Routes>
            </main>
            <ToastNotification />
        </AppProviders>
    );
};

const composeProviders = (...providers: React.ComponentType<{ children: React.ReactNode }>[]) => {
    return providers.reduce(
        (AccumulatedProviders, CurrentProvider) => {
            return ({ children }: { children: React.ReactNode }) => (
                <AccumulatedProviders>
                    <CurrentProvider>
                        {children}
                    </CurrentProvider>
                </AccumulatedProviders>
            );
        },
        ({ children }: { children: React.ReactNode }) => <>{children}</>
    );
};

export default App;
