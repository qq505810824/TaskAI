'use client'

import { TaskaiObjectiveFormModal, type TaskaiObjectiveFormPayload } from '@/components/taskai/TaskaiObjectiveFormModal'
import { TaskaiPageLoader } from '@/components/taskai/TaskaiPageLoader'
import { useAuth } from '@/hooks/useAuth'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { formatTaskaiDateTime } from '@/lib/taskai/date-format'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { useTaskaiSelectedOrg } from '@/hooks/taskai/useTaskaiSelectedOrg'
import type {
    TaskaiContextDocumentRow,
    TaskaiDocumentSummaryStatus,
    TaskaiProjectRow,
    TaskaiTaskGenerationRun,
    TaskaiTaskGenerationRunItem,
} from '@/types/taskai'
import {
    CheckCircle2,
    Loader2,
    Pencil,
    Plus,
    Rocket,
    Sparkles,
    Target,
    Trash2,
    UploadCloud,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

type RunItemMap = Record<string, TaskaiTaskGenerationRunItem[]>
type ItemDraft = {
    title: string
    description: string
    points: number
    type: 'one_time' | 'recurring'
    recurring_frequency: 'daily' | 'weekly' | 'monthly' | ''
    category: string
}
type ItemDraftMap = Record<string, ItemDraft>
type EditingItemMap = Record<string, boolean>

function getProjectStatusClasses(status: TaskaiProjectRow['status']) {
    if (status === 'active') return 'bg-emerald-100 text-emerald-800'
    if (status === 'draft') return 'bg-amber-100 text-amber-800'
    return 'bg-slate-200 text-slate-700'
}

function getDocumentStatusClasses(status: TaskaiDocumentSummaryStatus) {
    if (status === 'ready') return 'bg-emerald-100 text-emerald-800'
    if (status === 'processing') return 'bg-blue-100 text-blue-800'
    if (status === 'failed') return 'bg-rose-100 text-rose-800'
    return 'bg-slate-200 text-slate-700'
}

function getRunStatusClasses(status: TaskaiTaskGenerationRun['status']) {
    if (status === 'ready') return 'bg-blue-100 text-blue-800'
    if (status === 'published') return 'bg-emerald-100 text-emerald-800'
    if (status === 'running') return 'bg-amber-100 text-amber-800'
    if (status === 'failed') return 'bg-rose-100 text-rose-800'
    return 'bg-slate-200 text-slate-700'
}

function getVisibleProjectObjective(row: TaskaiProjectRow) {
    if (!row.objective?.trim()) return null
    return row.objective.trim()
}

function deriveTitleFromFileName(fileName: string) {
    return fileName.replace(/\.[^.]+$/, '').trim()
}

function buildItemDraft(item: TaskaiTaskGenerationRunItem): ItemDraft {
    return {
        title: item.title,
        description: item.description ?? '',
        points: item.points,
        type: item.type,
        recurring_frequency: item.recurring_frequency ?? '',
        category: item.category ?? 'General',
    }
}

export default function AdminTaskaiProjectsPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { taskaiFetch } = useTaskaiApi()
    const { memberships, loading: memLoading } = useTaskaiMemberships()

    const ownerMemberships = useMemo(() => memberships.filter((m) => m.role === 'owner'), [memberships])
    const { orgId } = useTaskaiSelectedOrg(ownerMemberships, 'admin')

    const [projects, setProjects] = useState<TaskaiProjectRow[]>([])
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [documents, setDocuments] = useState<TaskaiContextDocumentRow[]>([])
    const [runs, setRuns] = useState<TaskaiTaskGenerationRun[]>([])
    const [runItemsById, setRunItemsById] = useState<RunItemMap>({})
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
    const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
    const [selectedPublishItemIds, setSelectedPublishItemIds] = useState<string[]>([])
    const [itemDrafts, setItemDrafts] = useState<ItemDraftMap>({})
    const [editingItems, setEditingItems] = useState<EditingItemMap>({})

    const [loading, setLoading] = useState(true)
    const [documentsLoading, setDocumentsLoading] = useState(false)
    const [runsLoading, setRunsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)

    const [createOpen, setCreateOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [creatingManualItemRunId, setCreatingManualItemRunId] = useState<string | null>(null)
    const [publishingRunId, setPublishingRunId] = useState<string | null>(null)
    const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null)
    const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
    const [savingItemId, setSavingItemId] = useState<string | null>(null)
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
    const [deleteProjectTarget, setDeleteProjectTarget] = useState<TaskaiProjectRow | null>(null)

    const [uploadTitle, setUploadTitle] = useState('')
    const [uploadManualText, setUploadManualText] = useState('')
    const [uploadFile, setUploadFile] = useState<File | null>(null)

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            router.replace('/login')
        }
    }, [authLoading, router, user])

    const loadProjects = useCallback(async () => {
        if (!orgId || !user) {
            setProjects([])
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            setError(null)
            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/projects`)
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to load projects')
            setProjects((json.data?.projects ?? []) as TaskaiProjectRow[])
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
            setProjects([])
        } finally {
            setLoading(false)
        }
    }, [orgId, taskaiFetch, user])

    const loadDocuments = useCallback(
        async (projectId: string) => {
            if (!orgId) return
            setDocumentsLoading(true)
            try {
                const res = await taskaiFetch(
                    `/api/taskai/orgs/${orgId}/context-documents?projectId=${encodeURIComponent(projectId)}`
                )
                const json = await res.json()
                if (!json.success) throw new Error(json.message || 'Failed to load project documents')
                setDocuments((json.data?.documents ?? []) as TaskaiContextDocumentRow[])
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Unknown error')
                setDocuments([])
            } finally {
                setDocumentsLoading(false)
            }
        },
        [orgId, taskaiFetch]
    )

    const loadRuns = useCallback(
        async (projectId: string) => {
            if (!orgId) return
            setRunsLoading(true)
            try {
                const res = await taskaiFetch(
                    `/api/taskai/orgs/${orgId}/task-generation?projectId=${encodeURIComponent(projectId)}&includeItems=true`
                )
                const json = await res.json()
                if (!json.success) throw new Error(json.message || 'Failed to load generation runs')
                const nextRuns = (json.data?.runs ?? []) as TaskaiTaskGenerationRun[]
                const nextItemsById = (json.data?.itemsByRunId ?? {}) as RunItemMap
                setRuns(nextRuns)
                setRunItemsById(nextItemsById)
                setSelectedRunId((prev) => {
                    if (prev && nextRuns.some((run) => run.id === prev)) return prev
                    return nextRuns[0]?.id ?? null
                })
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Unknown error')
                setRuns([])
                setRunItemsById({})
            } finally {
                setRunsLoading(false)
            }
        },
        [orgId, taskaiFetch]
    )

    useEffect(() => {
        void loadProjects()
    }, [loadProjects])

    useEffect(() => {
        if (!projects.length) {
            setSelectedProjectId(null)
            return
        }
        setSelectedProjectId((prev) => {
            if (prev && projects.some((project) => project.id === prev)) return prev
            return projects[0].id
        })
    }, [projects])

    useEffect(() => {
        if (!selectedProjectId) {
            setDocuments([])
            setRuns([])
            setRunItemsById({})
            setSelectedDocumentIds([])
            setSelectedRunId(null)
            return
        }

        void loadDocuments(selectedProjectId)
        void loadRuns(selectedProjectId)
    }, [loadDocuments, loadRuns, selectedProjectId])

    useEffect(() => {
        setSelectedDocumentIds((prev) => {
            const available = new Set(documents.map((document) => document.id))
            const kept = prev.filter((id) => available.has(id))
            if (kept.length) return kept
            return documents.map((document) => document.id)
        })
    }, [documents])

    useEffect(() => {
        if (!uploadFile) return
        setUploadTitle(deriveTitleFromFileName(uploadFile.name))
    }, [uploadFile])

    const selectedProject = useMemo(
        () => projects.find((project) => project.id === selectedProjectId) ?? null,
        [projects, selectedProjectId]
    )

    const selectedRun = useMemo(() => runs.find((run) => run.id === selectedRunId) ?? null, [runs, selectedRunId])
    const selectedRunItems = useMemo(
        () => (selectedRunId ? runItemsById[selectedRunId] ?? [] : []),
        [runItemsById, selectedRunId]
    )
    const selectedPublishableCount = selectedRunItems.filter(
        (item) => !item.published_task_id && selectedPublishItemIds.includes(item.id)
    ).length

    useEffect(() => {
        setItemDrafts((prev) => {
            const next = { ...prev }
            for (const item of selectedRunItems) {
                if (!next[item.id]) {
                    next[item.id] = buildItemDraft(item)
                }
            }
            return next
        })
        setSelectedPublishItemIds((prev) => {
            const selectableIds = selectedRunItems.filter((item) => !item.published_task_id).map((item) => item.id)
            const kept = prev.filter((id) => selectableIds.includes(id))
            if (kept.length) return kept
            return selectableIds
        })
    }, [selectedRunItems])

    const handleCreateProject = async (payload: TaskaiObjectiveFormPayload) => {
        if (!orgId) return

        try {
            setCreating(true)
            setError(null)
            setNotice(null)
            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to create project')
            const created = json.data?.project as TaskaiProjectRow | undefined
            setCreateOpen(false)
            setNotice('Project created.')
            await loadProjects()
            if (created?.id) setSelectedProjectId(created.id)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setCreating(false)
        }
    }

    const resetUploadForm = () => {
        setUploadTitle('')
        setUploadManualText('')
        setUploadFile(null)
    }

    const handleUploadDocument = async () => {
        if (!orgId || !selectedProject) return

        const fallbackFile =
            !uploadFile && uploadManualText.trim()
                ? new File([uploadManualText.trim()], 'pasted-context.txt', { type: 'text/plain' })
                : null
        const file = uploadFile ?? fallbackFile
        if (!file) {
            setError('Please choose a file or paste document text first.')
            return
        }

        try {
            setUploading(true)
            setError(null)
            setNotice(null)

            const form = new FormData()
            form.set('file', file)
            if (uploadTitle.trim()) form.set('title', uploadTitle.trim())
            form.set('projectId', selectedProject.id)
            form.set('scope', 'project')
            if (selectedProject.name) form.set('projectName', selectedProject.name)
            if (uploadManualText.trim()) form.set('contentText', uploadManualText.trim())

            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/context-documents`, {
                method: 'POST',
                body: form,
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to upload project document')

            setNotice('Project document uploaded and summarized.')
            resetUploadForm()
            await loadDocuments(selectedProject.id)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setUploading(false)
        }
    }

    const handleDeleteDocument = async (documentId: string) => {
        if (!orgId || !selectedProject) return

        try {
            setDeletingDocumentId(documentId)
            setError(null)
            setNotice(null)
            const res = await taskaiFetch(
                `/api/taskai/orgs/${orgId}/context-documents/${documentId}`,
                { method: 'DELETE' }
            )
            const json = await res.json().catch(() => ({ success: res.ok }))
            if (!json.success) throw new Error(json.message || 'Failed to delete document')
            setNotice('Document deleted.')
            await loadDocuments(selectedProject.id)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setDeletingDocumentId(null)
        }
    }

    const handleDeleteProject = async () => {
        if (!orgId || !deleteProjectTarget) return

        try {
            setDeletingProjectId(deleteProjectTarget.id)
            setError(null)
            setNotice(null)
            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/projects/${deleteProjectTarget.id}`, {
                method: 'DELETE',
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to delete project')
            setDeleteProjectTarget(null)
            setNotice(
                `Project deleted. Removed ${Number(json.data?.deletedTaskCount ?? 0)} related tasks and ${Number(json.data?.deletedDocumentCount ?? 0)} documents.`
            )
            await loadProjects()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setDeletingProjectId(null)
        }
    }

    const handleGenerateTasks = async () => {
        if (!orgId || !selectedProject) return
        const isMoreGeneration = runs.length > 0

        try {
            setGenerating(true)
            setError(null)
            setNotice(null)
            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/task-generation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: selectedProject.id,
                    documentIds: selectedDocumentIds,
                    provider: 'ark',
                }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to generate tasks')

            const run = json.data?.run as TaskaiTaskGenerationRun
            const items = (json.data?.items ?? []) as TaskaiTaskGenerationRunItem[]
            setRuns((prev) => [run, ...prev.filter((row) => row.id !== run.id)])
            setRunItemsById((prev) => ({ ...prev, [run.id]: items }))
            setSelectedRunId(run.id)
            setNotice(
                isMoreGeneration
                    ? `Generated ${items.length} more task candidates in a new batch.`
                    : `Generated ${items.length} task candidates.`
            )
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setGenerating(false)
        }
    }

    const handleAddManualTask = async (runId: string) => {
        if (!orgId) return

        try {
            setCreatingManualItemRunId(runId)
            setError(null)
            setNotice(null)
            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/task-generation/${runId}/items`, {
                method: 'POST',
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to add task')

            const newItem = json.data?.item as TaskaiTaskGenerationRunItem
            setRunItemsById((prev) => ({
                ...prev,
                [runId]: [...(prev[runId] ?? []), newItem].sort((a, b) => a.sort_order - b.sort_order),
            }))
            setItemDrafts((prev) => ({ ...prev, [newItem.id]: buildItemDraft(newItem) }))
            setEditingItems((prev) => ({ ...prev, [newItem.id]: true }))
            setSelectedRunId(runId)
            setRuns((prev) =>
                prev.map((run) => (run.id === runId && run.status === 'published' ? { ...run, status: 'ready' } : run))
            )
            setNotice('Added a new manual task to the current batch.')
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setCreatingManualItemRunId(null)
        }
    }

    const handleItemDraftChange = (itemId: string, patch: Partial<ItemDraft>) => {
        setItemDrafts((prev) => ({
            ...prev,
            [itemId]: {
                ...(prev[itemId] ?? {
                    title: '',
                    description: '',
                    points: 100,
                    type: 'one_time',
                    recurring_frequency: '',
                    category: 'General',
                }),
                ...patch,
            },
        }))
    }

    const toggleItemEditing = (itemId: string, next?: boolean) => {
        setEditingItems((prev) => ({ ...prev, [itemId]: next ?? !prev[itemId] }))
    }

    const handleSaveItem = async (runId: string, itemId: string) => {
        if (!orgId) return
        const draft = itemDrafts[itemId]
        if (!draft) return

        try {
            setSavingItemId(itemId)
            setError(null)
            setNotice(null)
            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/task-generation/${runId}/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: draft.title,
                    description: draft.description,
                    points: draft.points,
                    type: draft.type,
                    recurring_frequency: draft.type === 'recurring' ? draft.recurring_frequency || null : null,
                    category: draft.category,
                }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to update generated task')
            const updated = json.data?.item as TaskaiTaskGenerationRunItem
            setRunItemsById((prev) => ({
                ...prev,
                [runId]: (prev[runId] ?? []).map((item) => (item.id === updated.id ? updated : item)),
            }))
            setItemDrafts((prev) => ({ ...prev, [updated.id]: buildItemDraft(updated) }))
            toggleItemEditing(updated.id, false)
            setNotice('Generated task updated.')
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setSavingItemId(null)
        }
    }

    const handleDeleteItem = async (runId: string, itemId: string) => {
        if (!orgId) return

        try {
            setDeletingItemId(itemId)
            setError(null)
            setNotice(null)
            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/task-generation/${runId}/items/${itemId}`, {
                method: 'DELETE',
            })
            const json = await res.json().catch(() => ({ success: res.ok }))
            if (!json.success) throw new Error(json.message || 'Failed to delete generated task')
            setRunItemsById((prev) => ({
                ...prev,
                [runId]: (prev[runId] ?? []).filter((item) => item.id !== itemId),
            }))
            setSelectedPublishItemIds((prev) => prev.filter((id) => id !== itemId))
            setEditingItems((prev) => {
                const next = { ...prev }
                delete next[itemId]
                return next
            })
            setNotice('Generated task deleted.')
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setDeletingItemId(null)
        }
    }

    const handlePublishRun = async (runId: string) => {
        if (!orgId || !selectedProject) return

        try {
            setPublishingRunId(runId)
            setError(null)
            setNotice(null)
            const res = await taskaiFetch(`/api/taskai/orgs/${orgId}/task-generation/${runId}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds: selectedPublishItemIds }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to publish generated tasks')

            const tasks = (json.data?.tasks ?? []) as Array<{ id: string }>
            setRunItemsById((prev) => {
                const current = prev[runId] ?? []
                const unpublishedItems = current.filter(
                    (item) => !item.published_task_id && selectedPublishItemIds.includes(item.id)
                )
                const publishedIds = tasks.map((task) => task.id)
                const next = current.map((item, index) => {
                    if (item.published_task_id) return item
                    const targetIndex = unpublishedItems.findIndex((row) => row.id === item.id)
                    if (targetIndex < 0) return item
                    return {
                        ...item,
                        published_task_id: publishedIds[targetIndex] ?? item.published_task_id,
                    }
                })
                return { ...prev, [runId]: next }
            })
            setRuns((prev) =>
                prev.map((run) =>
                    run.id === runId
                        ? {
                              ...run,
                              status:
                                  (runItemsById[runId] ?? []).filter(
                                      (item) =>
                                          !item.published_task_id && !selectedPublishItemIds.includes(item.id)
                                  ).length > 0
                                      ? 'ready'
                                      : 'published',
                          }
                        : run
                )
            )
            setSelectedPublishItemIds((prev) => prev.filter((id) => !selectedPublishItemIds.includes(id)))
            setNotice(`Published ${tasks.length} tasks to Task Board.`)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setPublishingRunId(null)
        }
    }

    if (authLoading || memLoading || (ownerMemberships.length > 0 && !orgId)) {
        return (
            <TaskaiPageLoader
                title="Loading Project Workspace..."
                description="Preparing your project, context documents, and AI task generation tools."
            />
        )
    }

    if (!user) {
        return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-500">Loading...</div>
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Project Management</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Create projects, attach context documents, and generate TaskAI tasks from project context.
                    </p>
                </div>
                {ownerMemberships.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        disabled={!orgId}
                        className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:shadow-xl hover:shadow-indigo-300 disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />
                        Create Project
                    </button>
                ) : null}
            </div>

            {error ? (
                <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            ) : null}
            {notice ? (
                <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {notice}
                </p>
            ) : null}

            {!orgId ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    No manageable organization yet. Create or select an organization in Team first.
                </p>
            ) : loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">Loading projects...</div>
            ) : projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <Target className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800">No projects yet</h3>
                    <p className="mt-2 text-sm text-slate-500">
                        Start by creating one project. Objective and description can stay empty until you want AI to use them.
                    </p>
                    <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                    >
                        <Plus className="h-4 w-4" />
                        Create first project
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <aside className="space-y-4">
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-800">Projects</h3>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                    {projects.length}
                                </span>
                            </div>
                            <div className="space-y-3">
                                {projects.map((project) => {
                                    const visibleObjective = getVisibleProjectObjective(project)
                                    const isActive = project.id === selectedProjectId
                                    return (
                                        <div
                                            key={project.id}
                                            className={`relative rounded-2xl border transition ${
                                                isActive
                                                    ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setSelectedProjectId(project.id)}
                                                className="w-full rounded-2xl p-4 pb-12 text-left"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <h4 className="truncate text-sm font-semibold text-slate-800">
                                                            {project.name}
                                                        </h4>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {visibleObjective ? `Objective: ${visibleObjective}` : 'Objective: not set'}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getProjectStatusClasses(project.status)}`}
                                                    >
                                                        {project.status}
                                                    </span>
                                                </div>
                                                <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
                                                    {project.description?.trim() || 'No project description yet.'}
                                                </p>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setDeleteProjectTarget(project)
                                                }}
                                                disabled={deletingProjectId === project.id}
                                                aria-label={`Delete ${project.name}`}
                                                className="absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 disabled:opacity-60"
                                            >
                                                {deletingProjectId === project.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    </aside>

                    <div className="space-y-6">
                        {selectedProject ? (
                            <>
                                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">
                                                {selectedProject.name}
                                            </h3>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {getVisibleProjectObjective(selectedProject)
                                                    ? `Objective: ${getVisibleProjectObjective(selectedProject)}`
                                                    : 'Objective is optional and not set yet.'}
                                            </p>
                                            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                                                {selectedProject.description?.trim() ||
                                                    'No project description yet. You can still upload documents and generate tasks, then come back later to refine the objective.'}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-start gap-2 text-xs">
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                                Created {formatTaskaiDateTime(selectedProject.created_at)}
                                            </span>
                                            <span
                                                className={`rounded-full px-2.5 py-1 font-medium ${getProjectStatusClasses(selectedProject.status)}`}
                                            >
                                                {selectedProject.status}
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-4 flex items-center gap-2">
                                        <UploadCloud className="h-5 w-5 text-indigo-600" />
                                        <div>
                                            <h3 className="text-base font-semibold text-slate-800">Project Documents</h3>
                                            <p className="text-sm text-slate-500">
                                                Upload context files or paste text so AI can summarize and use them during task generation.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <div>
                                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                                    Document title
                                                </label>
                                                <input
                                                    value={uploadTitle}
                                                    onChange={(e) => setUploadTitle(e.target.value)}
                                                    placeholder="Auto-filled from file name. You can still edit it."
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                                    Upload file
                                                </label>
                                                <input
                                                    type="file"
                                                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                                                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
                                                />
                                                <p className="mt-1 text-xs text-slate-400">
                                                    Text-based files work best right now. If needed, paste the extracted text below.
                                                </p>
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                                    Manual text
                                                </label>
                                                <textarea
                                                    rows={6}
                                                    value={uploadManualText}
                                                    onChange={(e) => setUploadManualText(e.target.value)}
                                                    placeholder="Optional. Paste project brief, proposal, meeting notes, or any context text here."
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => void handleUploadDocument()}
                                                disabled={uploading}
                                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60"
                                            >
                                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                                {uploading ? 'Uploading…' : 'Upload Document'}
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-slate-700">
                                                    Attached documents
                                                </p>
                                                {documentsLoading ? (
                                                    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        Refreshing…
                                                    </span>
                                                ) : null}
                                            </div>

                                            {documents.length ? (
                                                documents.map((document) => (
                                                    <label
                                                        key={document.id}
                                                        className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedDocumentIds.includes(document.id)}
                                                                onChange={(e) => {
                                                                    setSelectedDocumentIds((prev) => {
                                                                        if (e.target.checked) {
                                                                            return [...new Set([...prev, document.id])]
                                                                        }
                                                                        return prev.filter((id) => id !== document.id)
                                                                    })
                                                                }}
                                                                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                                                            />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-semibold text-slate-800">
                                                                            {document.title}
                                                                        </p>
                                                                        <p className="mt-1 text-xs text-slate-500">
                                                                            {formatTaskaiDateTime(document.updated_at)}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span
                                                                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getDocumentStatusClasses(document.summary_status)}`}
                                                                        >
                                                                            {document.summary_status}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.preventDefault()
                                                                                void handleDeleteDocument(document.id)
                                                                            }}
                                                                            disabled={deletingDocumentId === document.id}
                                                                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                                                                        >
                                                                            {deletingDocumentId === document.id ? (
                                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                            ) : (
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            )}
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </label>
                                                ))
                                            ) : (
                                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                                                    No project documents yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-4 flex items-center gap-2">
                                        <Rocket className="h-5 w-5 text-indigo-600" />
                                        <div>
                                            <h3 className="text-base font-semibold text-slate-800">AI Task Generation</h3>
                                            <p className="text-sm text-slate-500">
                                                Generate candidate tasks from the current project, optional objective, and selected document summaries.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                        Selected project
                                                    </p>
                                                    <p className="mt-1 text-sm font-semibold text-slate-800">
                                                        {selectedProject.name}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                        Selected documents
                                                    </p>
                                                    <p className="mt-1 text-sm font-semibold text-slate-800">
                                                        {selectedDocumentIds.length} of {documents.length}
                                                    </p>
                                                </div>
                                                <div className="md:col-span-2 text-sm text-slate-500">
                                                    AI will infer how many tasks to generate based on your project context length and the selected document summaries. If you need more options later, run generation again and TaskAI will try to avoid duplicating existing tasks.
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => void handleGenerateTasks()}
                                            disabled={generating}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 disabled:opacity-60"
                                        >
                                            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                            {generating ? 'Generating…' : runs.length ? 'Generate More Tasks' : 'Generate Tasks'}
                                        </button>
                                    </div>

                                    <div className="mt-5 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <h4 className="text-sm font-semibold text-slate-800">Recent runs</h4>
                                                {runsLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                                ) : null}
                                            </div>
                                            <div className="space-y-2">
                                                {runs.length ? (
                                                    runs.map((run) => (
                                                        <button
                                                            key={run.id}
                                                            type="button"
                                                            onClick={() => setSelectedRunId(run.id)}
                                                            className={`w-full rounded-2xl border p-3 text-left transition ${
                                                                run.id === selectedRunId
                                                                    ? 'border-indigo-300 bg-white shadow-sm'
                                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="truncate text-sm font-semibold text-slate-800">
                                                                    {formatTaskaiDateTime(run.created_at)}
                                                                </span>
                                                                <span
                                                                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getRunStatusClasses(run.status)}`}
                                                                >
                                                                    {run.status}
                                                                </span>
                                                            </div>
                                                            <p className="mt-2 text-xs text-slate-500">
                                                                {(runItemsById[run.id] ?? []).length} candidate item
                                                                {(runItemsById[run.id] ?? []).length === 1 ? '' : 's'}
                                                            </p>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                                                        No generation runs yet.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-800">Generated Tasks</h4>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Review these candidate tasks before publishing them into Task Board. You can also add one manually into the current batch.
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {selectedRun ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleAddManualTask(selectedRun.id)}
                                                            disabled={creatingManualItemRunId === selectedRun.id}
                                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                                                        >
                                                            {creatingManualItemRunId === selectedRun.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Plus className="h-4 w-4" />
                                                            )}
                                                            Add Task
                                                        </button>
                                                    ) : null}
                                                    {selectedRun && selectedRunItems.some((item) => !item.published_task_id) ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setSelectedPublishItemIds(
                                                                        selectedRunItems
                                                                            .filter((item) => !item.published_task_id)
                                                                            .map((item) => item.id)
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                                            >
                                                                Select All
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedPublishItemIds([])}
                                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                                                            >
                                                                Unselect All
                                                            </button>
                                                        </>
                                                    ) : null}
                                                    {selectedRun ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => void handlePublishRun(selectedRun.id)}
                                                            disabled={publishingRunId === selectedRun.id || selectedPublishableCount === 0}
                                                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-60"
                                                        >
                                                            {publishingRunId === selectedRun.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle2 className="h-4 w-4" />
                                                            )}
                                                            {selectedPublishableCount > 0
                                                                ? `Publish ${selectedPublishableCount} Tasks`
                                                                : 'Already Published'}
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {selectedRun && selectedRunItems.length ? (
                                                <div className="space-y-3">
                                                    {selectedRunItems.map((item) => {
                                                        const isEditing = !!editingItems[item.id] && !item.published_task_id
                                                        const draft = itemDrafts[item.id] ?? buildItemDraft(item)

                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                                            >
                                                            <div className="flex items-start gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.published_task_id ? true : selectedPublishItemIds.includes(item.id)}
                                                                    disabled={!!item.published_task_id}
                                                                    onChange={(e) => {
                                                                        setSelectedPublishItemIds((prev) => {
                                                                            if (e.target.checked) return [...new Set([...prev, item.id])]
                                                                            return prev.filter((id) => id !== item.id)
                                                                        })
                                                                    }}
                                                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                                                                />
                                                                <div className="min-w-0 flex-1 space-y-4">
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="space-y-3">
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                                                                    {(draft.category || item.category || 'General')}
                                                                                </span>
                                                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                                                                    {(draft.points || item.points)} pts
                                                                                </span>
                                                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                                                                    {(draft.type || item.type) === 'recurring'
                                                                                        ? `Recurring · ${(draft.recurring_frequency || item.recurring_frequency || 'unspecified')}`
                                                                                        : 'One-time'}
                                                                                </span>
                                                                                {item.published_task_id ? (
                                                                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                                                                                        Published
                                                                                    </span>
                                                                                ) : null}
                                                                            </div>
                                                                            {!isEditing ? (
                                                                                <div>
                                                                                    <h5 className="text-base font-semibold text-slate-800">
                                                                                        {draft.title || item.title}
                                                                                    </h5>
                                                                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                                                                        {draft.description?.trim() || item.description?.trim() || 'No description yet.'}
                                                                                    </p>
                                                                                </div>
                                                                            ) : null}
                                                                        </div>

                                                                        {!item.published_task_id ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleItemEditing(item.id)}
                                                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                                                            >
                                                                                <Pencil className="h-4 w-4" />
                                                                                {isEditing ? 'Hide Edit' : 'Edit'}
                                                                            </button>
                                                                        ) : null}
                                                                    </div>

                                                                    {isEditing ? (
                                                                        <div className="grid gap-3 md:grid-cols-2">
                                                                        <div className="md:col-span-2">
                                                                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                                                                                Title
                                                                            </label>
                                                                            <input
                                                                                value={draft.title}
                                                                                onChange={(e) =>
                                                                                    handleItemDraftChange(item.id, {
                                                                                        title: e.target.value,
                                                                                    })
                                                                                }
                                                                                disabled={!!item.published_task_id}
                                                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-50"
                                                                            />
                                                                        </div>
                                                                        <div className="md:col-span-2">
                                                                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                                                                                Description
                                                                            </label>
                                                                            <textarea
                                                                                rows={4}
                                                                                value={draft.description}
                                                                                onChange={(e) =>
                                                                                    handleItemDraftChange(item.id, {
                                                                                        description: e.target.value,
                                                                                    })
                                                                                }
                                                                                disabled={!!item.published_task_id}
                                                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-50"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                                                                                Category
                                                                            </label>
                                                                            <input
                                                                                value={draft.category}
                                                                                onChange={(e) =>
                                                                                    handleItemDraftChange(item.id, {
                                                                                        category: e.target.value,
                                                                                    })
                                                                                }
                                                                                disabled={!!item.published_task_id}
                                                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-50"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                                                                                Points
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                min={10}
                                                                                max={500}
                                                                                value={draft.points}
                                                                                onChange={(e) =>
                                                                                    handleItemDraftChange(item.id, {
                                                                                        points: Math.max(10, Math.min(500, Number(e.target.value) || 10)),
                                                                                    })
                                                                                }
                                                                                disabled={!!item.published_task_id}
                                                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-50"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                                                                                Type
                                                                            </label>
                                                                            <select
                                                                                value={draft.type}
                                                                                onChange={(e) =>
                                                                                    handleItemDraftChange(item.id, {
                                                                                        type: e.target.value as 'one_time' | 'recurring',
                                                                                        recurring_frequency: e.target.value === 'recurring' ? draft.recurring_frequency || 'weekly' : '',
                                                                                    })
                                                                                }
                                                                                disabled={!!item.published_task_id}
                                                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-50"
                                                                            >
                                                                                <option value="one_time">One-time</option>
                                                                                <option value="recurring">Recurring</option>
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                                                                                Recurring frequency
                                                                            </label>
                                                                            <select
                                                                                value={draft.recurring_frequency}
                                                                                onChange={(e) =>
                                                                                    handleItemDraftChange(item.id, {
                                                                                        recurring_frequency: e.target.value as ItemDraft['recurring_frequency'],
                                                                                    })
                                                                                }
                                                                                disabled={
                                                                                    !!item.published_task_id
                                                                                    || draft.type !== 'recurring'
                                                                                }
                                                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-50"
                                                                            >
                                                                                <option value="">None</option>
                                                                                <option value="daily">Daily</option>
                                                                                <option value="weekly">Weekly</option>
                                                                                <option value="monthly">Monthly</option>
                                                                            </select>
                                                                        </div>
                                                                        </div>
                                                                    ) : null}

                                                                    {!item.published_task_id ? (
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            {isEditing ? (
                                                                                <>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => void handleSaveItem(selectedRun.id, item.id)}
                                                                                        disabled={savingItemId === item.id}
                                                                                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                                                                                    >
                                                                                        {savingItemId === item.id ? (
                                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                                        ) : null}
                                                                                        Save Changes
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setItemDrafts((prev) => ({ ...prev, [item.id]: buildItemDraft(item) }))
                                                                                            toggleItemEditing(item.id, false)
                                                                                        }}
                                                                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                                                                    >
                                                                                        Cancel
                                                                                    </button>
                                                                                </>
                                                                            ) : null}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => void handleDeleteItem(selectedRun.id, item.id)}
                                                                                disabled={deletingItemId === item.id}
                                                                                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                                                                            >
                                                                                {deletingItemId === item.id ? (
                                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                                ) : (
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                )}
                                                                                Delete
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-slate-400">
                                                                            Published task ID: {item.published_task_id}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
                                                    Select or create a run to review generated tasks.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>
                            </>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
                                Select a project to manage documents and generate tasks.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <TaskaiObjectiveFormModal
                open={createOpen}
                submitting={creating}
                onClose={() => setCreateOpen(false)}
                onSubmit={(payload) => void handleCreateProject(payload)}
            />

            {deleteProjectTarget ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800">Delete project?</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            This will permanently remove{' '}
                            <span className="font-semibold text-slate-800">
                                {deleteProjectTarget.name}
                            </span>
                            , its attached documents, generation runs, and related tasks.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteProjectTarget(null)}
                                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={deletingProjectId === deleteProjectTarget.id}
                                onClick={() => void handleDeleteProject()}
                                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                                {deletingProjectId === deleteProjectTarget.id ? 'Deleting…' : 'Delete Project'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
