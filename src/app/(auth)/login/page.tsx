'use client'

import { useAuth } from '@/hooks/useAuth'
import { motion } from 'framer-motion'
import { AlertCircle, Loader2, Lock, LogIn, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

function GoogleMark() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.2-.9 2.3-1.9 3.1v2.6h3.1c1.8-1.7 3.1-4.1 3.1-7.5Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.9-.9 6.5-2.4l-3.1-2.6c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.2H3.2v2.7A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.4 13.7A6 6 0 0 1 6 12c0-.6.1-1.2.4-1.7V7.6H3.2A10 10 0 0 0 2 12c0 1.6.4 3.1 1.2 4.4l3.2-2.7Z" />
            <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.8 5.6l3.2 2.7C7.2 7.9 9.4 6.1 12 6.1Z" />
        </svg>
    )
}

export default function LoginPage() {
    const { login, loginWithGoogle, user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const searchParams = useSearchParams()
    const redirect = searchParams.get('redirect')
    const verified = searchParams.get('verified') === '1'
    const passwordReset = searchParams.get('reset') === '1'

    useEffect(() => {
        if (authLoading) return
        if (user) {
            router.replace(redirect || '/')
        }
    }, [authLoading, redirect, router, user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await login(email, password)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        setError('')
        setLoading(true)

        try {
            await loginWithGoogle(redirect)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Google login failed')
            setLoading(false)
        }
    }

    if (authLoading || user) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="mb-4 h-10 w-10 animate-spin text-indigo-600" />
                <p className="text-sm text-slate-500">Checking your session...</p>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
        >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                        <LogIn className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
                    <p className="text-gray-500 text-sm">Please login to your account to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {verified && (
                        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            Your email has been verified. You can log in now.
                        </div>
                    )}

                    {passwordReset && (
                        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            Your password has been updated. Please log in with your new password.
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Email address
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                                placeholder="you@example.com"
                                required
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                        </div>
                        <div className="relative mb-1.5">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                                placeholder="password"
                                required
                                disabled={loading}
                            />
                        </div>

                    </div>


                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm"
                        >
                            <AlertCircle className="w-4 h-4" />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Logging in...
                            </>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" />
                                Login
                            </>
                        )}
                    </button>

                    <div className="relative py-1">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-3 text-xs font-medium uppercase tracking-wide text-gray-400">or</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={loading}
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-xl font-semibold border border-gray-300 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <GoogleMark />
                        Continue with Google
                    </button>


                    <div className="text-center mt-6 flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            No account?{' '}
                            <Link
                                href={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'}
                                className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                            >
                                Register now
                            </Link>
                        </p>
                        <Link
                            href="/forgot-password"
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                        >
                            Forgot password?
                        </Link>
                    </div>
                </form>
            </div>
        </motion.div>
    )
}
