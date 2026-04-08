'use client';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, LogIn, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function JoinPage() {
    const router = useRouter();
    const { user: authUser, isLoading: authLoading } = useAuth();
    const [inviteCode, setInviteCode] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [successToast, setSuccessToast] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    const digitsOnly = inviteCode.replace(/\D/g, '');
    const isNineDigits = digitsOnly.length === 9;
    const displayCode = digitsOnly.replace(/(\d{3})(?=\d)/g, '$1 ');

    useEffect(() => {
        if (!authLoading && !authUser) {
            router.replace('/login?redirect=%2Fjoin');
        }
    }, [authLoading, authUser, router]);

    const handleJoinOrg = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isNineDigits) {
            setValidationError('Please enter a 9-digit invitation code');
            return;
        }

        setIsValidating(true);
        setValidationError(null);

        try {
            if (authLoading) {
                setValidationError('Loading login status, please wait');
                setIsValidating(false);
                return;
            }
            if (!authUser) {
                router.replace(`/login?redirect=${encodeURIComponent('/join')}`);
                setIsValidating(false);
                return;
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();
            const token = session?.access_token ?? authUser.token;

            const headers = new Headers({ 'Content-Type': 'application/json' });
            if (token) headers.set('Authorization', `Bearer ${token}`);

            const res = await fetch('/api/taskai/invites/accept', {
                method: 'POST',
                headers,
                body: JSON.stringify({ code: digitsOnly }),
            });
            const json = await res.json();

            if (!json.success) {
                setValidationError(json.message || 'Invitation code is invalid or expired');
                setIsValidating(false);
                return;
            }

            setSuccessToast('Joined team, redirecting to task page...');
            setTimeout(() => {
                router.push('/taskai/tasks');
            }, 700);
        } catch {
            setValidationError('Invitation code verification failed, please try again later');
            setIsValidating(false);
        }
    };

    return (
        <div className="mt-14 flex h-full items-center justify-center px-4">
            {!authLoading && !authUser ? null : (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
                    <div className="mb-8 text-center">
                        <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
                            <Users className="h-10 w-10 text-indigo-600" />
                        </div>
                        <h1 className="mb-2 text-3xl font-bold text-gray-900">Join the team</h1>
                        <p className="text-gray-600">
                            Enter the 9-digit code your team owner received when they created the organization (same code shown on the Team page).
                        </p>
                    </div>

                    <form onSubmit={handleJoinOrg} className="space-y-6">
                        <div>
                            <label htmlFor="inviteCode" className="mb-2 block text-sm font-medium text-gray-700">
                                Invitation code
                            </label>
                            <input
                                id="inviteCode"
                                type="text"
                                inputMode="numeric"
                                autoComplete="off"
                                value={displayCode}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                                    setInviteCode(digits);
                                    setValidationError(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                }}
                                placeholder="Code (e.g.: 100083426)"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-sm tracking-wider focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-lg"
                                disabled={isValidating}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isValidating || !isNineDigits}
                            className="w-full rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-indigo-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <span className="flex items-center justify-center gap-2">
                                {isValidating ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Joining...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="h-5 w-5" />
                                        Join the team
                                    </>
                                )}
                            </span>
                        </button>

                        {validationError && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                            >
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{validationError}</span>
                            </motion.div>
                        )}

                        {successToast && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                            >
                                <span>{successToast}</span>
                            </motion.div>
                        )}
                    </form>

                    <div className="mt-6 border-t border-gray-200 pt-6">
                        <p className="text-center text-xs text-gray-500">
                            Tip: Codes are 9 digits (often shown as three groups of three), e.g. 100 083 426.
                        </p>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/taskai/tasks')}
                        className="text-sm cursor-pointer font-medium text-indigo-600 hover:text-indigo-700"
                    >
                        My Tasks →
                    </button>
                </div>
            </motion.div>
            )}
        </div>
    );
}
