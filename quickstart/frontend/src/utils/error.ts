// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

import type { ErrorResponse } from "../openapi.d.ts";
import type { AxiosError } from 'axios';
import { useToast } from '../stores/toastStore';


function isAxiosErrorWithErrorResponse(
    err: unknown
): err is AxiosError<ErrorResponse> {
    return typeof (err as any)?.isAxiosError === 'boolean';
}

function extractError(err: unknown): { status?: number; message?: string } {
    if (isAxiosErrorWithErrorResponse(err)) {
        const status = err.response?.status;
        const data = err.response?.data;
        return {
            status,
            message: data?.message ?? `HTTP ${status ?? 'Unknown error'}`
        };
    }
    // fallback
    const anyErr = err as any;
    return {
        status: anyErr?.status,
        message: anyErr?.message ?? 'Unexpected error',
    };
}

export function withErrorHandling(action: string) {
    const toast = useToast();

    function wrap<T extends (...args: any[]) => Promise<any>>(
        fn: T,
        onSuccess?: (result: Awaited<ReturnType<T>>) => void,
    ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | void> {
        return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | void> => {
            try {
                const result = await fn(...args);
                onSuccess?.(result);
                return result;
            } catch (err) {
                const { status, message } = extractError(err);
                const msg = message ? `${action} reason: ${message}` : `Unexpected error for ${action}`;
                if (status === 400) { toast.displayError(msg); throw err; }
                if (status === 401) { toast.displayError(msg); throw err; }
                if (status === 403) { toast.displayError(msg); throw err; }
                if (status === 404) {
                    if (action === 'Fetching credit profile') return;
                    toast.displayError(msg);
                    throw err;
                }
                if (status === 409) { toast.displayError(msg); throw err; }
                toast.displayError(msg);
                throw err;
            }
        };
    }
    return wrap;
}
