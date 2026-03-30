'use client'

import type { TaskaiObjectiveStatus } from '@/types/taskai'
import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export type TaskaiObjectiveFormPayload = {
    objective: string | null
    description: string | null
    project_name: string
    status: TaskaiObjectiveStatus
}

function defaultsForCreate() {
    return {
        title: '',
        description: '',
        project_name: '',
        status: 'active' as TaskaiObjectiveStatus,
    }
}

export function TaskaiObjectiveFormModal({
    open,
    submitting,
    onClose,
    onSubmit,
}: {
    open: boolean
    submitting: boolean
    onClose: () => void
    onSubmit: (payload: TaskaiObjectiveFormPayload) => void | Promise<void>
}) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [projectName, setProjectName] = useState('')
    const [status, setStatus] = useState<TaskaiObjectiveStatus>('active')

    useEffect(() => {
        if (!open) return
        const defaults = defaultsForCreate()
        setTitle(defaults.title)
        setDescription(defaults.description)
        setProjectName(defaults.project_name)
        setStatus(defaults.status)
    }, [open])

    if (!open) return null

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmedProjectName = projectName.trim()
        if (!trimmedProjectName) return

        await onSubmit({
            objective: title.trim() || null,
            description: description.trim() || null,
            project_name: trimmedProjectName,
            status,
        })
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="bg-linear-to-r from-indigo-600 to-purple-600 px-6 py-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-white">Create Project</h3>
                            <p className="mt-0.5 text-sm text-indigo-200">
                                Define the project context first, then optionally add an objective for AI-generated tasks.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-5 p-6">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Project Name</label>
                        <p className="mb-1.5 text-xs text-slate-500">
                            This is the core container for documents, AI task generation, and later brainstorming.
                        </p>
                        <input
                            required
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="e.g., Onboarding Revamp"
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Objective</label>
                        <p className="mb-1.5 text-xs text-slate-500">
                            Optional. Use this if you want AI task generation to aim toward a specific outcome.
                        </p>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Improve onboarding activation in Q2"
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
                        <p className="mb-1.5 text-xs text-slate-500">
                            Optional. Add success criteria, scope, constraints, or context that should guide AI-generated tasks.
                        </p>
                        <textarea
                            rows={5}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the business goal, important constraints, and what success should look like..."
                            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as TaskaiObjectiveStatus)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                        >
                            <option value="active">Active</option>
                            <option value="draft">Draft</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200/60 transition hover:shadow-lg hover:shadow-indigo-300 disabled:opacity-60"
                        >
                            <Plus className="h-4 w-4" />
                            {submitting ? 'Saving…' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
