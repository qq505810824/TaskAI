'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

export type TaskaiFetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export function TaskaiOrgModal({
    open,
    mode,
    orgId,
    initialName,
    initialDescription,
    onClose,
    onAfterSave,
    onCreatedOrg,
    taskaiFetch,
}: {
    open: boolean
    mode: 'create' | 'edit'
    orgId: string | null
    initialName: string
    initialDescription: string
    onClose: () => void
    onAfterSave: () => void | Promise<void>
    /** 创建成功后回传新组织 id，便于父级切换选中 */
    onCreatedOrg?: (orgId: string) => void
    taskaiFetch: TaskaiFetchFn
}) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open) return
        setName(initialName)
        setDescription(initialDescription)
    }, [open, initialName, initialDescription])

    if (!open) return null

    const title = mode === 'create' ? 'Create Organization' : 'Edit Organization'
    const subtitle =
        mode === 'create'
            ? 'Set up a workspace for your team'
            : 'Update name and description (Owner only)'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const n = name.trim()
        if (!n) return
        setSaving(true)
        try {
            const desc = description.trim() || null
            if (mode === 'create') {
                const res = await taskaiFetch('/api/taskai/orgs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: n, description: desc }),
                })
                const json = await res.json()
                if (!json.success) throw new Error(json.message || 'Create failed')
                const newId = json.data?.organization?.id as string | undefined
                if (newId) onCreatedOrg?.(newId)
            } else {
                if (!orgId) throw new Error('No organization')
                const res = await taskaiFetch(`/api/taskai/orgs/${orgId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: n, description: desc }),
                })
                const json = await res.json()
                if (!json.success) throw new Error(json.message || 'Save failed')
            }
            onClose()
            await onAfterSave()
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Request failed')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="bg-linear-to-r from-indigo-600 to-purple-600 px-6 py-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-white">{title}</h3>
                            <p className="mt-0.5 text-sm text-indigo-200">{subtitle}</p>
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
                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 p-6">
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Organization name</label>
                        <p className="mb-1.5 text-xs text-slate-500">Shown in the org switcher and member invites.</p>
                        <input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Northwind Labs"
                            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description</label>
                        <p className="mb-1.5 text-xs text-slate-500">Optional context for teammates (mission, scope).</p>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What does this organization focus on?"
                            rows={3}
                            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                        />
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
                            disabled={saving || !name.trim()}
                            className="flex-1 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200/60 transition hover:shadow-lg hover:shadow-indigo-300 disabled:opacity-60"
                        >
                            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
