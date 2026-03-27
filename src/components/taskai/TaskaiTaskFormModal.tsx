'use client'

import { TASKAI_TASK_CATEGORY_OPTIONS } from '@/components/taskai/taskai-task-categories'
import type { TaskaiRecurringFrequency, TaskaiTaskRow, TaskaiTaskType } from '@/types/taskai'
import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export type TaskaiTaskFormPayload = {
    title: string
    description: string | null
    points: number
    type: TaskaiTaskType
    recurring_frequency: TaskaiRecurringFrequency | null
    category: string | null
}

const DEFAULT_POINTS = 100

function defaultsForCreate() {
    return {
        title: '',
        description: '',
        points: String(DEFAULT_POINTS),
        type: 'one_time' as TaskaiTaskType,
        recurring_frequency: 'weekly' as TaskaiRecurringFrequency,
        category: 'General',
    }
}

export function TaskaiTaskFormModal({
    open,
    mode,
    initialTask,
    submitting,
    onClose,
    onSubmit,
}: {
    open: boolean
    mode: 'create' | 'edit'
    initialTask: TaskaiTaskRow | null
    submitting: boolean
    onClose: () => void
    onSubmit: (payload: TaskaiTaskFormPayload) => void | Promise<void>
}) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [points, setPoints] = useState(String(DEFAULT_POINTS))
    const [type, setType] = useState<TaskaiTaskType>('one_time')
    const [recurringFrequency, setRecurringFrequency] = useState<TaskaiRecurringFrequency>('weekly')
    const [category, setCategory] = useState<string>('General')

    useEffect(() => {
        if (!open) return
        if (mode === 'edit' && initialTask) {
            setTitle(initialTask.title)
            setDescription(initialTask.description ?? '')
            setPoints(String(initialTask.points))
            setType(initialTask.type)
            setRecurringFrequency(initialTask.recurring_frequency ?? 'weekly')
            setCategory(initialTask.category ?? 'General')
        } else {
            const d = defaultsForCreate()
            setTitle(d.title)
            setDescription(d.description)
            setPoints(d.points)
            setType(d.type)
            setRecurringFrequency(d.recurring_frequency)
            setCategory(d.category)
        }
    }, [open, mode, initialTask])

    if (!open) return null

    const heading = mode === 'create' ? 'Create New Task' : 'Edit Task'
    const subheading = mode === 'create' ? 'Assign work to your team' : 'Update open task details'

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const t = title.trim()
        if (!t) return
        const desc = description.trim()
        if (!desc) return
        const p = Math.floor(Number(points))
        if (Number.isNaN(p) || p < 10 || p > 500) {
            alert('Points must be between 10 and 500')
            return
        }
        const freq = type === 'recurring' ? recurringFrequency : null
        if (type === 'recurring' && !freq) {
            alert('Select a recurrence schedule')
            return
        }
        await onSubmit({
            title: t,
            description: desc,
            points: p,
            type,
            recurring_frequency: freq,
            category: category || null,
        })
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="bg-linear-to-r from-indigo-600 to-purple-600 px-6 py-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-white">{heading}</h3>
                            <p className="mt-0.5 text-sm text-indigo-200">{subheading}</p>
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
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Task Title</label>
                        <p className="mb-1.5 text-xs text-slate-500">Short, action-oriented name so owners can scan the board.</p>
                        <input
                            name="title"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Design homepage mockup"
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
                        <p className="mb-1.5 text-xs text-slate-500">Add acceptance criteria, links, or context for whoever claims it.</p>
                        <textarea
                            name="description"
                            required
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the task in detail..."
                            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Points</label>
                            <p className="mb-1.5 text-xs text-slate-500">10–500; higher signals more effort or impact.</p>
                            <input
                                name="points"
                                type="number"
                                min={10}
                                max={500}
                                required
                                value={points}
                                onChange={(e) => setPoints(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Type</label>
                            <p className="mb-1.5 text-xs text-slate-500">One-off vs repeats on a schedule.</p>
                            <select
                                name="type"
                                value={type}
                                onChange={(e) => setType(e.target.value as TaskaiTaskType)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                            >
                                <option value="one_time">⚡ One-time</option>
                                <option value="recurring">🔄 Recurring</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Category</label>
                            <p className="mb-1.5 text-xs text-slate-500">Used for filtering and reporting.</p>
                            <select
                                name="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                            >
                                {TASKAI_TASK_CATEGORY_OPTIONS.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {type === 'recurring' ? (
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Recurrence</label>
                            <p className="mb-1.5 text-xs text-slate-500">How often this task should be expected to repeat.</p>
                            <select
                                value={recurringFrequency}
                                onChange={(e) => setRecurringFrequency(e.target.value as TaskaiRecurringFrequency)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </div>
                    ) : null}
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
                            {submitting ? 'Saving…' : mode === 'create' ? 'Create Task' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
