'use client'

import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function AuthCallbackPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const {
                    data: { session },
                    error: sessionError
                } = await supabase.auth.getSession()

                if (sessionError) {
                    throw new Error('We could not complete the sign-in process. Please try again.')
                }

                const authUser = session?.user
                if (!authUser) {
                    throw new Error('We could not complete the sign-in process. Please try again.')
                }

                const displayName =
                    authUser.user_metadata?.username ||
                    authUser.user_metadata?.full_name ||
                    authUser.user_metadata?.name ||
                    (authUser.email ? authUser.email.split('@')[0] : '用户')

                const avatarUrl =
                    authUser.user_metadata?.avatar_url ||
                    authUser.user_metadata?.picture ||
                    authUser.user_metadata?.photo_url ||
                    null

                await fetch('/api/auth/sync-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        authUserId: authUser.id,
                        email: authUser.email ?? null,
                        name: displayName,
                        avatarUrl
                    })
                })

                const flow = searchParams.get('flow')
                if (flow === 'email-verification') {
                    await supabase.auth.signOut()
                    router.replace('/login?verified=1')
                    return
                }

                const next = searchParams.get('next')
                router.replace(next || '/')
            } catch (callbackError) {
                setError(callbackError instanceof Error ? callbackError.message : 'Google sign-in failed. Please try again.')
            }
        }

        void handleCallback()
    }, [router, searchParams])

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
                {error ? (
                    <>
                        <h1 className="text-xl font-semibold text-slate-900">Google 登录失败</h1>
                        <p className="mt-3 text-sm text-slate-500">{error}</p>
                        <button
                            type="button"
                            onClick={() => router.replace('/login')}
                            className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                        >
                            Back to login
                        </button>
                    </>
                ) : (
                    <>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                        </div>
                        <h1 className="mt-4 text-xl font-semibold text-slate-900">Signing you in with Google</h1>
                        <p className="mt-3 text-sm text-slate-500">Please wait while we finish setting up your account.</p>
                    </>
                )}
            </div>
        </div>
    )
}

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                        </div>
                        <h1 className="mt-4 text-xl font-semibold text-slate-900">Preparing sign-in</h1>
                        <p className="mt-3 text-sm text-slate-500">Please wait while we continue the authentication flow.</p>
                    </div>
                </div>
            }
        >
            <AuthCallbackPageContent />
        </Suspense>
    )
}
