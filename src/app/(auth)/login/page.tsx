'use client'

import { useAuth } from '@/hooks/useAuth'
import { motion } from 'framer-motion'
import { AlertCircle, Loader2, Lock, LogIn, Mail } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function LoginPage() {
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const showDevTestAccount = true

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await login(email, password)
        } catch (err) {
            setError(err instanceof Error ? err.message : '登录失败')
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
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                        <LogIn className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">欢迎回来</h1>
                    <p className="text-gray-500 text-sm">请登录您的账号以继续</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            邮箱地址
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
                                密码
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
                                placeholder="••••••••"
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
                                正在登录...
                            </>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" />
                                登录
                            </>
                        )}
                    </button>


                    <div className="text-center mt-6 flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            还没有账号？{' '}
                            <Link
                                href="/register"
                                className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                            >
                                立即注册
                            </Link>
                        </p>
                        <Link
                            href="/forgot-password"
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                        >
                            忘记密码?
                        </Link>
                    </div>
                </form>
                {showDevTestAccount && (
                    <div className="mt-8 pt-6 border-t border-dashed border-gray-100">
                        <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">开发环境测试账号</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between group">
                                    <span className="text-[11px] text-indigo-600/70">邮箱地址</span>
                                    <code className="text-[11px] bg-white px-2 py-1 rounded-lg border border-indigo-100 text-indigo-700 font-mono font-medium shadow-sm">talent@gmail.com</code>
                                </div>
                                <div className="flex items-center justify-between group">
                                    <span className="text-[11px] text-indigo-600/70">密码</span>
                                    <code className="text-[11px] bg-white px-2 py-1 rounded-lg border border-indigo-100 text-indigo-700 font-mono font-medium shadow-sm">talent123123</code>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </motion.div>
    )
}
