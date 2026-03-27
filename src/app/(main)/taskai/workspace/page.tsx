'use client'

import { useAuth } from '@/hooks/useAuth'
import { TaskCompleteCelebration } from '@/components/taskai/TaskCompleteCelebration'
import { useRtcTutorSession } from '@/hooks/useRtcTutorSession'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import type { Conversation, Meet } from '@/types/meeting'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Brain, CheckCircle2, Mic, MicOff, PhoneOff } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'

const emojiAvatars = ['🦁', '🐼', '🦊', '🐯', '🐨', '🐸', '🦉', '🐻']

function formatClock(iso: string | null | undefined) {
    if (!iso) return ''
    try {
        return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } catch {
        return ''
    }
}

function buildPseudoMeet(taskId: string, title: string, description: string): Meet {
    const now = new Date().toISOString()
    return {
        id: `taskai-${taskId}`,
        meeting_code: taskId.slice(0, 9).padEnd(9, '0'),
        title,
        description: description || 'TaskAI voice collaboration workspace',
        host_id: 'taskai',
        start_time: now,
        duration: null,
        status: 'ongoing',
        join_url: '',
        created_at: now,
        updated_at: now,
        ended_at: null,
    }
}

function EndWorkspaceModal({
    open,
    rounds,
    onCancel,
    onConfirm,
}: {
    open: boolean
    rounds: number
    onCancel: () => void
    onConfirm: () => void
}) {
    return (
        <AnimatePresence>
            {open ? (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={onCancel}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-sm rounded-3xl bg-white shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="rounded-t-3xl bg-linear-to-b from-red-500 to-red-700 px-6 py-8 text-center text-white">
                                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
                                    <PhoneOff className="h-10 w-10" />
                                </div>
                                <h3 className="text-2xl font-bold">结束对话</h3>
                                <p className="mt-1 text-sm text-red-50">本次共 {rounds} 轮对话，确定结束吗？</p>
                            </div>
                            <div className="px-6 py-5">
                                <p className="mb-5 text-center text-sm text-gray-600">
                                    结束后会输出本次对话记录（已预留后端对接方法）。
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={onCancel}
                                        className="flex-1 rounded-xl bg-gray-100 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-200"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700"
                                    >
                                        确认结束
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            ) : null}
        </AnimatePresence>
    )
}

function TaskaiWorkspacePageInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user, isLoading: authLoading } = useAuth()
    const { taskaiFetch } = useTaskaiApi()

    const taskId = searchParams.get('taskId') || ''
    const taskTitle = searchParams.get('title') || 'Task'
    const taskDesc = searchParams.get('description') || ''
    const taskPoints = Number(searchParams.get('points') || 0)

    const pseudoMeet = useMemo(() => buildPseudoMeet(taskId, taskTitle, taskDesc), [taskDesc, taskId, taskTitle])

    const {
        conversations,
        rtcStatus,
        isRtcActive,
        studentDraftLive,
        teacherDraft,
        startRtcSession,
        stopRtcSession,
        getConversationsSnapshot,
        errorMessage,
    } = useRtcTutorSession(pseudoMeet, user?.id || '', { requireUserMeet: false })

    const [seconds, setSeconds] = useState(0)
    const [showEndConfirm, setShowEndConfirm] = useState(false)
    const [finishing, setFinishing] = useState(false)
    const [notice, setNotice] = useState<string | null>(null)
    const [celebratePoints, setCelebratePoints] = useState<number | null>(null)

    const avatarFallback = useMemo(() => {
        if (!taskId) return emojiAvatars[0]
        const n = taskId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
        return emojiAvatars[n % emojiAvatars.length]
    }, [taskId])

    useEffect(() => {
        if (!isRtcActive) return
        const t = setInterval(() => setSeconds((s) => s + 1), 1000)
        return () => clearInterval(t)
    }, [isRtcActive])

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            const redirect = `/taskai/workspace?${searchParams.toString()}`
            router.replace(`/login?redirect=${encodeURIComponent(redirect)}`)
        }
    }, [authLoading, router, searchParams, user])

    useEffect(() => {
        if (!user || !taskId) return
        if (!isRtcActive && rtcStatus === 'idle') {
            void startRtcSession()
        }
    }, [isRtcActive, rtcStatus, startRtcSession, taskId, user])

    const timeText = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

    const mergedConversations: Array<{ id: string; from: 'user' | 'ai'; text: string; at: string | null }> = []
    conversations.forEach((c) => {
        if (c.user_message_text?.trim()) {
            mergedConversations.push({ id: `${c.id}-u`, from: 'user', text: c.user_message_text, at: c.user_sent_at })
        }
        if (c.ai_response_text?.trim()) {
            mergedConversations.push({ id: `${c.id}-a`, from: 'ai', text: c.ai_response_text, at: c.ai_responded_at })
        }
    })
    if (studentDraftLive?.trim()) {
        mergedConversations.push({ id: 'draft-user', from: 'user', text: studentDraftLive, at: new Date().toISOString() })
    }
    if (teacherDraft?.trim()) {
        mergedConversations.push({ id: 'draft-ai', from: 'ai', text: teacherDraft, at: new Date().toISOString() })
    }

    const bottomRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, [mergedConversations.length, studentDraftLive, teacherDraft])

    async function exportConversationRecords(records: Conversation[]) {
        // Reserved integration point: send records to backend for persistence / summary later
        console.log('[TaskAI][workspace][records]', { taskId, taskTitle, records })
    }

    const handleFinishConversation = async () => {
        setFinishing(true)
        try {
            await stopRtcSession()
            const snapshot = getConversationsSnapshot()
            await exportConversationRecords(snapshot)

            // Optional: mark task complete when ending workspace
            if (taskId) {
                const res = await taskaiFetch(`/api/taskai/tasks/${taskId}/complete`, { method: 'POST' })
                const json = await res.json()
                if (!json.success) {
                    setNotice('对话已结束，任务完成失败，请在任务页手动完成。')
                    setTimeout(() => router.push('/taskai/tasks'), 900)
                } else {
                    setNotice('对话已结束，任务已完成。')
                    setCelebratePoints(taskPoints)
                    setTimeout(() => {
                        setCelebratePoints(null)
                        router.push('/taskai/tasks')
                    }, 1300)
                }
            } else {
                setNotice('对话已结束，记录已输出。')
                setTimeout(() => router.push('/taskai/tasks'), 900)
            }
        } catch {
            setNotice('结束对话失败，请重试')
        } finally {
            setFinishing(false)
            setShowEndConfirm(false)
        }
    }

    if (authLoading || !user) {
        return <div className="p-6 text-center text-slate-500">Loading...</div>
    }

    return (
        <div className="fixed inset-0 z-50 video-grid-bg flex flex-col bg-slate-950 text-white">
            <TaskCompleteCelebration
                open={celebratePoints != null}
                points={celebratePoints ?? 0}
                message="Conversation closed successfully."
            />
            <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-600">
                        <Brain className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">TaskAI Workspace</h3>
                        <p className="text-xs text-white/50">{taskTitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> LIVE
                    </span>
                    <span className="hidden text-xs text-white/40 sm:block">{timeText}</span>
                </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-2 sm:p-6">
                <div className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-indigo-500/20 bg-linear-to-br from-indigo-950 to-slate-900">
                    <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/50" />
                    <div
                        className="absolute inset-0 opacity-10"
                        style={{
                            backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
                            backgroundSize: '30px 30px',
                        }}
                    />
                    <div className="relative flex flex-col items-center gap-4">
                        <motion.div
                            animate={{
                                scale: [1, 1.05, 1],
                                boxShadow: [
                                    '0 20px 45px rgba(79,70,229,0.35)',
                                    '0 28px 60px rgba(139,92,246,0.45)',
                                    '0 20px 45px rgba(79,70,229,0.35)',
                                ],
                            }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            className="flex h-28 w-28 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 sm:h-36 sm:w-36"
                        >
                            <Bot className="h-14 w-14 text-white sm:h-16 sm:w-16" />
                        </motion.div>
                        <div className="flex h-8 items-center gap-1">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ height: [8, 18, 10, 16, 8] }}
                                    transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                        delay: i * 0.08,
                                    }}
                                    className="w-1 rounded-full bg-indigo-400"
                                />
                            ))}
                        </div>
                        <p className="text-sm font-medium text-indigo-300">AI Assistant</p>
                    </div>
                    <div className="absolute bottom-3 left-3">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                            <Bot className="h-3.5 w-3.5" />
                            TaskAI
                        </span>
                    </div>
                </div>

                <div className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-slate-800 to-slate-900">
                    <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-black/50" />
                    <div className="relative flex flex-col items-center gap-4">
                        {user.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.username}
                                className="h-28 w-28 rounded-full border-4 border-white/20 object-cover shadow-xl sm:h-36 sm:w-36"
                            />
                        ) : (
                            <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/20 bg-white/10 text-6xl shadow-xl sm:h-36 sm:w-36">
                                {avatarFallback}
                            </div>
                        )}
                        <p className="text-sm font-medium text-white">{user.username}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-3 sm:px-6">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-white/60">Current Task</p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-white">{taskTitle}</p>
                        <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400">{taskPoints} pts</span>
                    </div>
                    {taskDesc ? <p className="mt-1 truncate text-xs text-white/60">{taskDesc}</p> : null}
                </div>
            </div>

            <div className="px-4 pb-3 sm:px-6">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3 backdrop-blur-sm">
                    <div className="mb-2 text-xs text-white/60">Conversation Records</div>
                    <div className="max-h-[200px] space-y-3 overflow-y-auto pr-1">
                        {mergedConversations.map((conv) =>
                            conv.from === 'user' ? (
                                <div key={conv.id} className="flex justify-end">
                                    <div className="max-w-[75%]">
                                        <div className="mb-1 text-right text-[10px] text-gray-300">{formatClock(conv.at)} You</div>
                                        <div className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white">
                                            {conv.text}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div key={conv.id} className="flex justify-start">
                                    <div className="max-w-[75%]">
                                        <div className="mb-1 text-[10px] text-gray-300">AI {formatClock(conv.at)}</div>
                                        <div className="whitespace-pre-wrap rounded-xl border border-teal-400/20 bg-teal-500/15 px-3 py-2 text-sm text-white">
                                            {conv.text}
                                        </div>
                                    </div>
                                </div>
                            )
                        )}
                        <div ref={bottomRef} />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center gap-3 border-t border-white/10 bg-black/30 px-4 py-4 sm:px-6">
                <button
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    onClick={() => {
                        if (isRtcActive) void stopRtcSession()
                        else void startRtcSession()
                    }}
                    title={isRtcActive ? 'Mute/Stop' : 'Start'}
                >
                    {isRtcActive ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>

                <button
                    onClick={() => setShowEndConfirm(true)}
                    disabled={finishing}
                    className="flex h-12 items-center gap-2 rounded-full bg-linear-to-r from-emerald-500 to-green-500 px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-green-600"
                >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Mark Task Complete</span>
                    <span className="sm:hidden">Complete</span>
                </button>

                <button
                    onClick={() => setShowEndConfirm(true)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600 shadow-lg shadow-red-500/30"
                    title="End"
                >
                    <PhoneOff className="h-5 w-5" />
                </button>
            </div>

            {notice ? (
                <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded-lg border border-emerald-300/30 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100">
                    {notice}
                </div>
            ) : null}

            {errorMessage ? (
                <div className="absolute left-1/2 top-28 -translate-x-1/2 rounded-lg border border-red-300/40 bg-red-500/20 px-4 py-2 text-sm text-red-100">
                    {errorMessage}
                </div>
            ) : null}

            <EndWorkspaceModal
                open={showEndConfirm}
                rounds={conversations.length}
                onCancel={() => setShowEndConfirm(false)}
                onConfirm={() => void handleFinishConversation()}
            />
        </div>
    )
}

export default function TaskaiWorkspacePage() {
    return (
        // <TaskaiWorkspacePageInner />
        <Suspense fallback={<div className="p-6 text-center text-slate-500">Loading workspace...</div>}>
            <TaskaiWorkspacePageInner />
        </Suspense>
    )
}
