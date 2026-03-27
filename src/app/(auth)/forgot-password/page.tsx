'use client'

import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess(false)
        setLoading(true)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) throw error
            setSuccess(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send reset email')
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
        >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                <div className="mb-6">
                    <Link
                        href="/login"
                        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to login
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                        <Mail className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot password</h1>
                    <p className="text-gray-500 text-sm">We will send a reset password link to your email</p>
                </div>

                {success ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-4"
                    >
                        <div className="flex justify-center mb-4">
                            <CheckCircle2 className="w-12 h-12 text-green-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Email has been sent</h3>
                        <p className="text-gray-600 text-sm mb-6">
                            The reset link has been sent to <span className="font-medium text-gray-900">{email}</span>, please check your inbox (and spam folder).
                        </p>
                        <button
                            onClick={() => setSuccess(false)}
                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                        >
                            Re-enter email
                        </button>
                    </motion.div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
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
                                    placeholder="your@email.com"
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
                            disabled={loading || !email}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Mail className="w-5 h-5" />
                                    Send reset email
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </motion.div>
    )
}
