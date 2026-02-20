// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import React, { useEffect, useState } from 'react';
import { useToast } from '../stores/toastStore';
import api from '../api';
import { Client, LoginLink, FeatureFlags } from "../openapi";

const LoginView: React.FC = () => {
    const [loginLinks, setLoginLinks] = useState<LoginLink[]>([]);
    const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
    const toast = useToast();

    useEffect(() => {
        const fetchLoginLinks = async () => {
            try {
                const client: Client = await api.getClient();
                const response = await client.listLinks();
                setLoginLinks(response.data);
            } catch (error) {
                toast.displayError('Error fetching login links');
            }
        };
        const fetchFeatureFlags = async () => {
            try {
                const client: Client = await api.getClient();
                const response = await client.getFeatureFlags();
                setFeatureFlags(response.data);
                if (response.data.authMode === 'oauth2') {
                    await fetchLoginLinks();
                }
            } catch (error) {
                toast.displayError('Error fetching feature flags');
                setFeatureFlags({ authMode: 'shared-secret' });
            }
        };
        fetchFeatureFlags();
    }, [toast]);

    const isOAuth2 = featureFlags?.authMode === 'oauth2';
    return (
        isOAuth2 ? (
            <div className="container">
                <h2>Login with OAuth 2.0</h2>
                <table className="table table-striped">
                    <tbody>
                        {loginLinks.map((link) => (
                            <tr key={link.url}>
                                <td>
                                    <a className="btn btn-link" href={link.url}>{link.name}</a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="text-muted mt-3">Select a login option above to sign in.</p>
            </div>
        ) : (
            <div className="login-container">
                <h1 className="login-title">Login</h1>
                <form name="f" action="login/shared-secret" method="POST" className="login-form">
                    <div className="form-group">
                        <label htmlFor="username" className="form-label">User:</label>
                        <input type="text" id="username" name="username" className="form-input" required />
                        <input type="hidden" name="password" value="" />
                        <button type="submit" name="submit" className="form-button">Sign in</button>
                    </div>
                </form>
                <p className="text-muted mt-3">Enter your username to sign in.</p>
            </div>

        )
    );
}

export default LoginView;
