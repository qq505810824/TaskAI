'use client'

import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import {
    type TaskaiTaskCompletionEvidenceRow,
    useTaskaiTaskRecords,
} from '@/hooks/taskai/useTaskaiTaskRecords'
import { useAuth } from '@/hooks/useAuth'
import { formatTaskaiDateTime } from '@/lib/taskai/date-format'
import {
    ArrowLeft,
    CheckCircle2,
    FileText,
    Loader2,
    MessageSquareQuote,
    Sparkles,
    Trash2,
    Upload,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

function EvidenceCard({
    item,
    canDelete,
    deleting,
    onDelete,
}: {
    item: TaskaiTaskCompletionEvidenceRow
    canDelete: boolean
    deleting: boolean
    onDelete: (item: TaskaiTaskCompletionEvidenceRow) => void
}) {
    const isFile = item.evidence_type === 'file'

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-800">
                        {isFile ? item.file_name || 'Uploaded progress file' : 'Progress note'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{formatTaskaiDateTime(item.created_at, '')}</p>
                </div>
                {canDelete ? (
                    <button
                        type="button"
                        disabled={deleting}
                        onClick={() => onDelete(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    >
                        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Delete
                    </button>
                ) : null}
            </div>

            {isFile ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    {item.mime_type ? <span className="text-xs text-slate-500">{item.mime_type}</span> : null}
                    {typeof item.file_size === 'number' ? (
                        <span className="text-xs text-slate-500">{Math.max(1, Math.round(item.file_size / 1024))} KB</span>
                    ) : null}
                    {item.view_url ? (
                        <a
                            href={item.view_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            View file
                        </a>
                    ) : (
                        <span className="text-xs text-slate-400">File preview unavailable</span>
                    )}
                </div>
            ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.text_content}</p>
            )}
        </div>
    )
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
    const { taskaiFetch } = useTaskaiApi()
    const router = useRouter()
    const { task, summary, conversations, evidence, loading, error, refresh } = useTaskaiTaskRecords(taskId)

    const [textEvidence, setTextEvidence] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [savingText, setSavingText] = useState(false)
    const [uploadingFile, setUploadingFile] = useState(false)
    const [completing, setCompleting] = useState(false)
    const [deletingEvidenceId, setDeletingEvidenceId] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [errorNotice, setErrorNotice] = useState<string | null>(null)

    const isMyInProgressTask = useMemo(
        () => !!user && task?.assignee_user_id === user.id && task?.status === 'in_progress',
        [task?.assignee_user_id, task?.status, user]
    )

    const canComplete = isMyInProgressTask && evidence.length > 0

    async function handleSaveTextEvidence() {
        const value = textEvidence.trim()
        if (!value) return

        setSavingText(true)
        setErrorNotice(null)
        setNotice(null)
        try {
            const res = await taskaiFetch(`/api/taskai/tasks/${taskId}/evidence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textContent: value }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to save progress note')
            setTextEvidence('')
            setNotice('Progress note saved.')
            await refresh()
        } catch (e) {
            setErrorNotice(e instanceof Error ? e.message : 'Failed to save progress note')
        } finally {
            setSavingText(false)
        }
    }

    async function handleUploadEvidenceFile() {
        if (!selectedFile) return

        setUploadingFile(true)
        setErrorNotice(null)
        setNotice(null)
        try {
            const form = new FormData()
            form.set('file', selectedFile)
            const res = await taskaiFetch(`/api/taskai/tasks/${taskId}/evidence`, {
                method: 'POST',
                body: form,
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to upload progress file')
            setSelectedFile(null)
            setNotice('Progress file uploaded.')
            await refresh()
        } catch (e) {
            setErrorNotice(e instanceof Error ? e.message : 'Failed to upload progress file')
        } finally {
            setUploadingFile(false)
        }
    }

    async function handleDeleteEvidence(item: TaskaiTaskCompletionEvidenceRow) {
        setDeletingEvidenceId(item.id)
        setErrorNotice(null)
        setNotice(null)
        try {
            const res = await taskaiFetch(`/api/taskai/tasks/${taskId}/evidence/${item.id}`, {
                method: 'DELETE',
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to delete progress entry')
            setNotice('Progress entry deleted.')
            await refresh()
        } catch (e) {
            setErrorNotice(e instanceof Error ? e.message : 'Failed to delete progress entry')
        } finally {
            setDeletingEvidenceId(null)
        }
    }

    async function handleMarkCompleted() {
        if (!canComplete) return

        setCompleting(true)
        setErrorNotice(null)
        setNotice(null)
        try {
            const res = await taskaiFetch(`/api/taskai/tasks/${taskId}/complete`, { method: 'POST' })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to complete task')
            setNotice('Task marked as completed.')
            await refresh()
        } catch (e) {
            setErrorNotice(e instanceof Error ? e.message : 'Failed to complete task')
        } finally {
            setCompleting(false)
        }
    }

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
                        {task?.project_name ? (
                            <p className="mt-3 text-sm font-medium text-indigo-600">Project: {task.project_name}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span>Task ID: {taskId}</span>
                            {task?.status ? <span>Status: {task.status.replace('_', ' ')}</span> : null}
                        </div>
                    </section>

                    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <h2 className="text-lg font-bold text-slate-800">📝 Progress Updates</h2>
                        </div>
                        <p className="text-sm text-slate-600">
                            Finish chatting with AI first, then add a progress note or upload a file before marking this task as completed.
                        </p>

                        {notice ? (
                            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                {notice}
                            </div>
                        ) : null}
                        {errorNotice ? (
                            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {errorNotice}
                            </div>
                        ) : null}

                        {isMyInProgressTask ? (
                            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-sm font-semibold text-slate-800">Write a progress note</p>
                                    <textarea
                                        value={textEvidence}
                                        onChange={(e) => setTextEvidence(e.target.value)}
                                        placeholder="Describe your result, what was delivered, and any important update or link."
                                        className="mt-3 min-h-[150px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void handleSaveTextEvidence()}
                                        disabled={savingText || !textEvidence.trim()}
                                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                                    >
                                        {savingText ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                        Save progress note
                                    </button>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-sm font-semibold text-slate-800">Upload progress file</p>
                                    <p className="mt-2 text-sm text-slate-500">
                                        Upload a document, screenshot, report, or any deliverable related to this task.
                                    </p>
                                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                                        <input
                                            type="file"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                                            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                                        />
                                        {selectedFile ? (
                                            <p className="mt-3 text-sm text-slate-600">Selected file: {selectedFile.name}</p>
                                        ) : null}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleUploadEvidenceFile()}
                                        disabled={uploadingFile || !selectedFile}
                                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                                    >
                                        {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                        Upload progress file
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        <div className="mt-5 space-y-3">
                            {!evidence.length ? (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                                    No progress updates yet.
                                </div>
                            ) : (
                                evidence.map((item) => (
                                    <EvidenceCard
                                        key={item.id}
                                        item={item}
                                        canDelete={isMyInProgressTask && item.user_id === user.id}
                                        deleting={deletingEvidenceId === item.id}
                                        onDelete={handleDeleteEvidence}
                                    />
                                ))
                            )}
                        </div>

                        {isMyInProgressTask ? (
                            <div className="mt-5 flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => void handleMarkCompleted()}
                                    disabled={!canComplete || completing}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    Mark as Completed
                                </button>
                                {!canComplete ? (
                                    <p className="text-sm text-slate-500">Add at least one note or file first.</p>
                                ) : null}
                            </div>
                        ) : null}
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
                                <p className="mt-3 text-xs text-slate-400">Generated time: {formatTaskaiDateTime(summary.generated_at, '')}</p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">No summary generated yet.</p>
                        )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <MessageSquareQuote className="h-4 w-4 text-emerald-500" />
                            <h2 className="text-lg font-bold text-slate-800">Meeting record</h2>
                        </div>
                        {!conversations.length ? (
                            <p className="text-sm text-slate-500">No conversation records.</p>
                        ) : (
                            <div className="space-y-4">
                                {conversations.map((c) => (
                                    <div key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                        <div className="mb-2 text-xs text-slate-400">{formatTaskaiDateTime(c.created_at, '')}</div>
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
