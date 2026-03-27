'use client'

import { useTaskaiTaskRecords } from '@/hooks/taskai/useTaskaiTaskRecords'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, MessageSquareQuote, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

function formatTime(iso: string | null | undefined) {
    if (!iso) return ''
    try {
        return new Date(iso).toLocaleString('zh-CN')
    } catch {
        return ''
    }
}

export function TaskDetailView({
    taskId,
    backHref,
    backText = 'Back',
}: {
    taskId: string
    backHref: string
    backText?: string
}) {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { task, summary, conversations, loading, error } = useTaskaiTaskRecords(taskId)

    if (authLoading || !user) {
        return <div className="mx-auto max-w-5xl px-4 py-12 text-center text-slate-500">Loading...</div>
    }

    return (
        <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => router.push(backHref)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {backText}
                </button>
            </div>

            {loading ? (
                <p className="text-slate-500">Loading submission details...</p>
            ) : error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            ) : (
                <>
                    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h1 className="text-2xl font-bold text-slate-800">{task?.title ?? 'Task'}</h1>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{task?.description || 'No task description'}</p>
                        <p className="mt-3 text-xs text-slate-400">Task ID: {taskId}</p>
                    </section>

                    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-indigo-500" />
                            <h2 className="text-lg font-bold text-slate-800">AI Summary</h2>
                        </div>
                        {summary ? (
                            <>
                                <p className="text-sm leading-relaxed text-slate-700">{summary.summary}</p>
                                {summary.key_points?.length ? (
                                    <div className="mt-4 space-y-2">
                                        {summary.key_points.map((kp, idx) => (
                                            <div key={`${kp.point}-${idx}`} className="rounded-xl bg-slate-50 p-3">
                                                <p className="text-sm font-semibold text-slate-800">{kp.point}</p>
                                                <p className="mt-1 text-sm text-slate-600">{kp.detail}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                                <p className="mt-3 text-xs text-slate-400">Generated time: {formatTime(summary.generated_at)}</p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">No summary generated yet.</p>
                        )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <MessageSquareQuote className="h-4 w-4 text-emerald-500" />
                            <h2 className="text-lg font-bold text-slate-800">Submission content (conversation records)</h2>
                        </div>
                        {!conversations.length ? (
                            <p className="text-sm text-slate-500">No conversation records.</p>
                        ) : (
                            <div className="space-y-4">
                                {conversations.map((c) => (
                                    <div key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                        <div className="mb-2 text-xs text-slate-400">{formatTime(c.created_at)}</div>
                                        <div className="space-y-2">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">You</p>
                                                <p className="text-sm text-slate-700">{c.user_message_text || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">AI</p>
                                                <p className="text-sm text-slate-700">{c.ai_response_text || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}
