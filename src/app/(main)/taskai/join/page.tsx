'use client'

import { useAuth } from '@/hooks/useAuth'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function TaskaiJoinPage() {
    const { user, isLoading: authLoading } = useAuth()
    const { taskaiFetch } = useTaskaiApi()
    const router = useRouter()
    const [code, setCode] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        const c = new URLSearchParams(window.location.search).get('code')
        if (c) setCode(c)
    }, [])

    useEffect(() => {
        if (!authLoading && !user) {
            const next = `/taskai/join${code ? `?code=${encodeURIComponent(code)}` : ''}`
            router.replace(`/login?redirect=${encodeURIComponent(next)}`)
        }
    }, [authLoading, user, router, code])

    const handleAccept = async () => {
        const c = code.trim()
        if (!c) {
            setMessage('请填写或从链接中带上邀请码')
            return
        }
        setSubmitting(true)
        setMessage(null)
        try {
            const res = await taskaiFetch('/api/taskai/invites/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: c }),
            })
            const json = await res.json()
            if (!json.success) {
                setMessage(json.message || '接受邀请失败')
                return
            }
            router.replace('/taskai/tasks')
        } catch {
            setMessage('网络错误，请重试')
        } finally {
            setSubmitting(false)
        }
    }

    if (authLoading || !user) {
        return (
            <div className="mx-auto max-w-md px-4 py-16 text-center text-slate-500">
                加载中…
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
            <h1 className="text-2xl font-bold text-slate-800">加入组织</h1>
            <p className="mt-2 text-sm text-slate-500">
                通过 Owner 分享的邀请链接进入时，邀请码会自动填入；也可手动粘贴。
            </p>
            <div className="mt-6 space-y-4">
                <input
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    placeholder="邀请码"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                />
                <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleAccept()}
                    className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60"
                >
                    {submitting ? '处理中…' : '加入组织'}
                </button>
                {message ? <p className="text-sm text-red-600">{message}</p> : null}
            </div>
        </div>
    )
}
