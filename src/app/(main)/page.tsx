'use client';

import { motion } from 'framer-motion';
import { AlertCircle, Loader2, LogIn, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
    const router = useRouter();
    const { user: authUser, isLoading: authLoading } = useAuth();
    const [inviteCode, setInviteCode] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [successToast, setSuccessToast] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    const digitsOnly = inviteCode.replace(/\D/g, '');
    const isNineDigits = digitsOnly.length === 9;
    const displayCode = digitsOnly.replace(/(\d{3})(?=\d)/g, '$1 ');

    const handleJoinOrg = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isNineDigits) {
            setValidationError('请输入9位数字邀请码');
            return;
        }

        setIsValidating(true);
        setValidationError(null);

        try {
            if (authLoading) {
                setValidationError('正在加载登录状态，请稍候');
                setIsValidating(false);
                return;
            }
            if (!authUser) {
                router.replace(`/login?redirect=${encodeURIComponent('/')}`);
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
                setValidationError(json.message || '邀请码无效或已过期');
                setIsValidating(false);
                return;
            }

            setSuccessToast('已加入组织，正在跳转任务页...');
            setTimeout(() => {
                router.push('/taskai/tasks');
            }, 700);
        } catch {
            setValidationError('邀请码验证失败，请稍后重试');
            setIsValidating(false);
        }
    };

    return (
        <div className="mt-14 flex h-full items-center justify-center px-4">
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
                        <h1 className="mb-2 text-3xl font-bold text-gray-900">加入团队</h1>
                        <p className="text-gray-600">输入9位邀请码，快速加入组织协作</p>
                    </div>

                    <form onSubmit={handleJoinOrg} className="space-y-6">
                        <div>
                            <label htmlFor="inviteCode" className="mb-2 block text-sm font-medium text-gray-700">
                                邀请码
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
                                placeholder="请输入邀请码(如: 100083426)"
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
                                        加入中...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="h-5 w-5" />
                                        加入组织
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
                            提示：邀请码通常由 9 位数字组成，按 3-3-3 分组，如：100 083 426
                        </p>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/admin/taskai/members')}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                        管理员入口 →
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
