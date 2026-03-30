'use client'

import { TaskaiPageLoader } from '@/components/taskai/TaskaiPageLoader'
import { useAuth } from '@/hooks/useAuth'
import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { formatTaskaiDateTime } from '@/lib/taskai/date-format'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { useTaskaiSelectedOrg } from '@/hooks/taskai/useTaskaiSelectedOrg'
import type { TaskaiPromptTemplate, TaskaiPromptVersion } from '@/types/taskai'
import { Bot, ChevronDown, ChevronUp, FileUp, FlaskConical, Loader2, RotateCcw, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type DraftMap = Record<string, string>
type SavingMap = Record<string, boolean>
type VersionMap = Record<string, TaskaiPromptVersion[]>
type ExpandedMap = Record<string, boolean>
type ExpandedPromptMap = Record<string, boolean>
type PromptPreviewInputMap = Record<string, Record<string, string>>
type PromptPreviewUploadMap = Record<string, Record<string, string>>
type PromptPreviewLoadingMap = Record<string, boolean>
type PromptPreviewResultMap = Record<string, PromptPreviewResult | null>
type CategoryKey = 'all' | 'conversation' | 'summary'

type PromptPreviewField = {
    key: string
    label: string
    type: 'input' | 'textarea' | 'file'
    placeholder?: string
    rows?: number
}

type PromptPreviewResult = {
    promptKey: string
    mode: 'composed_prompt' | 'model_response'
    runtimeUserPrompt: string | null
    composedPrompt: string | null
    parsedResult: Record<string, unknown> | null
}

function normalizePromptTemplate(prompt: TaskaiPromptTemplate): TaskaiPromptTemplate {
    return {
        ...prompt,
        placeholders: Array.isArray(prompt.placeholders) ? prompt.placeholders : [],
        placeholder_rules:
            typeof prompt.placeholder_rules === 'string' && prompt.placeholder_rules.trim()
                ? prompt.placeholder_rules
                : 'No placeholder restrictions configured.',
        required_inputs: Array.isArray(prompt.required_inputs) ? prompt.required_inputs : [],
        runtime_context_label:
            typeof prompt.runtime_context_label === 'string' && prompt.runtime_context_label.trim()
                ? prompt.runtime_context_label
                : null,
        runtime_context_description:
            typeof prompt.runtime_context_description === 'string' && prompt.runtime_context_description.trim()
                ? prompt.runtime_context_description
                : null,
        runtime_context_template:
            typeof prompt.runtime_context_template === 'string' && prompt.runtime_context_template.trim()
                ? prompt.runtime_context_template
                : null,
        runtime_context_placeholders: Array.isArray(prompt.runtime_context_placeholders)
            ? prompt.runtime_context_placeholders
            : [],
    }
}

function getPromptCategory(prompt: TaskaiPromptTemplate): Exclude<CategoryKey, 'all'> {
    if (prompt.service === 'volc_rtc_s2s') {
        return 'conversation'
    }
    return 'summary'
}

function getPromptCategoryLabel(category: CategoryKey) {
    if (category === 'conversation') return 'Conversation'
    if (category === 'summary') return 'Summary'
    return 'All'
}

function getPromptVersionActionLabel(action: TaskaiPromptVersion['action']) {
    if (action === 'saved') return 'Saved'
    if (action === 'reset_to_default') return 'Reset to default'
    return 'Rolled back'
}

function getPromptPreviewFields(promptKey: TaskaiPromptTemplate['prompt_key']): PromptPreviewField[] {
    switch (promptKey) {
        case 'taskai_rtc_tutor_template':
            return [
                { key: 'topic', label: 'Topic', type: 'input', placeholder: 'Sprint planning for mobile launch' },
                { key: 'description', label: 'Description', type: 'textarea', rows: 4, placeholder: 'Current task description or extra guidance' },
                {
                    key: 'projectDocumentSummary',
                    label: 'Project Document Summary',
                    type: 'textarea',
                    rows: 6,
                    placeholder: 'Saved uploaded document summaries for this project',
                },
                {
                    key: 'currentTaskSummary',
                    label: 'Current Task Summary',
                    type: 'textarea',
                    rows: 4,
                    placeholder: 'The task currently being discussed with AI',
                },
                {
                    key: 'projectTaskOverview',
                    label: 'Project Task Overview',
                    type: 'textarea',
                    rows: 8,
                    placeholder: 'Auto-generated task overview for this project',
                },
            ]
        case 'taskai_ai_chat_summary_prompt':
            return [
                { key: 'taskTitle', label: 'Task Title', type: 'input', placeholder: 'Improve onboarding checklist' },
                { key: 'taskDescription', label: 'Task Description', type: 'textarea', rows: 3, placeholder: 'Task description shown to AI' },
                { key: 'language', label: 'Output Language', type: 'input', placeholder: 'English' },
                {
                    key: 'transcript',
                    label: 'Transcript',
                    type: 'textarea',
                    rows: 9,
                    placeholder: 'Paste a sample chat transcript here',
                },
            ]
        case 'taskai_project_document_summary_prompt':
            return [
                { key: 'documentTitle', label: 'Document Title', type: 'input', placeholder: 'Mobile Launch Brief' },
                { key: 'projectName', label: 'Project Name', type: 'input', placeholder: 'TaskAI Mobile Launch' },
                { key: 'projectObjective', label: 'Project Objective', type: 'input', placeholder: 'Improve task completion speed' },
                {
                    key: 'rawDocumentText',
                    label: 'Upload Document',
                    type: 'file',
                    placeholder: 'Upload a text-based project document for preview',
                },
            ]
        case 'taskai_generate_todos_from_project_and_objective':
            return [
                { key: 'organizationName', label: 'Organization Name', type: 'input', placeholder: 'IT Team' },
                { key: 'projectName', label: 'Project Name', type: 'input', placeholder: 'TaskAI Mobile Launch' },
                { key: 'projectObjective', label: 'Project Objective', type: 'input', placeholder: 'Improve daily task completion speed' },
                {
                    key: 'projectDescription',
                    label: 'Project Description',
                    type: 'textarea',
                    rows: 4,
                    placeholder: 'Optional project description',
                },
                {
                    key: 'documentSummaries',
                    label: 'Document Summaries',
                    type: 'textarea',
                    rows: 10,
                    placeholder: 'Paste one or more project document summaries here',
                },
                {
                    key: 'existingTaskTitles',
                    label: 'Existing Tasks To Avoid Duplicating',
                    type: 'textarea',
                    rows: 6,
                    placeholder: 'Paste existing task titles, one per line',
                },
            ]
    }
}

function getDefaultPromptPreviewInputs(promptKey: TaskaiPromptTemplate['prompt_key']): Record<string, string> {
    switch (promptKey) {
        case 'taskai_rtc_tutor_template':
            return {
                topic: 'Plan a lightweight mobile launch for TaskAI',
                description: 'Focus on priorities, risks, dependencies, and next steps for a 6-week release.',
                projectDocumentSummary:
                    'Launch brief: The release should stay lightweight, reuse existing APIs, and prioritize the critical task review, claim, and AI brainstorming flow for internal pilot users.',
                currentTaskSummary:
                    'Current task for this chat:\n[in_progress] Plan a lightweight mobile launch · Category: Product Planning · 120 pts · One-time\nCurrent task details: Define release scope, sequencing, and key dependencies for the 6-week mobile launch.',
                projectTaskOverview:
                    'Project: TaskAI Mobile Launch\nObjective: Deliver a focused internal pilot that helps team members complete tasks faster.\n\nProject task overview: 4 total · 2 open · 1 in progress · 1 completed\n- [Current] Plan a lightweight mobile launch (Product Planning · 120 pts · One-time) — Define release scope, sequencing, and key dependencies.\n- [open] Finalize Android QA checklist (QA · 60 pts · One-time) — Confirm the minimum mobile task flow on target devices.\n- [open] Prepare pilot rollout notes (Operations · 40 pts · One-time) — Align the internal pilot rollout and support expectations.\n- [completed] Reuse existing task APIs review (Engineering · 50 pts · One-time) — The team already confirmed which APIs can be reused.',
            }
        case 'taskai_ai_chat_summary_prompt':
            return {
                taskTitle: 'Improve onboarding checklist',
                taskDescription: 'Brainstorm how to simplify the first-run checklist for new users.',
                language: 'English',
                transcript:
                    'User: We should reduce friction in the first-run setup.\nAI: Which step causes the most drop-off today?\nUser: Connecting integrations feels too heavy.\nAI: Then the first milestone may be to separate must-have setup from optional setup and test a shorter flow.',
            }
        case 'taskai_project_document_summary_prompt':
            return {
                documentTitle: 'TaskAI Mobile Launch Brief',
                projectName: 'TaskAI Mobile Launch',
                projectObjective: 'Improve daily task completion speed',
                rawDocumentText:
                    'TaskAI Mobile Launch aims to ship a lightweight mobile experience for internal pilot users within 6 weeks. The team should prioritize the task review, claiming, and AI brainstorming flow while reusing existing web APIs whenever possible.',
            }
        case 'taskai_generate_todos_from_project_and_objective':
            return {
                organizationName: 'IT Team',
                projectName: 'TaskAI Mobile Launch',
                projectObjective: 'Improve daily task completion speed',
                projectDescription:
                    'Launch a focused mobile experience that helps internal pilot users review and complete tasks faster.',
                documentSummaries:
                    '1. Mobile launch should stay lightweight, reuse existing APIs, and focus on task review / claim / AI brainstorming.\n2. Release target is 6 weeks with limited engineering bandwidth.\n3. The first pilot audience is internal team members who need faster daily task execution.',
                existingTaskTitles:
                    'Validate minimum mobile task flow\nReuse existing task APIs in mobile app\nPrepare internal pilot rollout notes',
            }
    }
}

export default function AdminTaskaiPromptsPage() {
    const { user, isLoading: authLoading } = useAuth()
    const router = useRouter()
    const { taskaiFetch } = useTaskaiApi()
    const { memberships, loading: membershipsLoading } = useTaskaiMemberships()
    const ownerMemberships = useMemo(() => memberships.filter((m) => m.role === 'owner'), [memberships])
    const { orgId } = useTaskaiSelectedOrg(ownerMemberships, 'admin')

    const [prompts, setPrompts] = useState<TaskaiPromptTemplate[]>([])
    const [versions, setVersions] = useState<VersionMap>({})
    const [drafts, setDrafts] = useState<DraftMap>({})
    const [saving, setSaving] = useState<SavingMap>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [expandedHistory, setExpandedHistory] = useState<ExpandedMap>({})
    const [expandedPrompts, setExpandedPrompts] = useState<ExpandedPromptMap>({})
    const [previewInputs, setPreviewInputs] = useState<PromptPreviewInputMap>({})
    const [previewUploads, setPreviewUploads] = useState<PromptPreviewUploadMap>({})
    const [previewLoading, setPreviewLoading] = useState<PromptPreviewLoadingMap>({})
    const [previewResults, setPreviewResults] = useState<PromptPreviewResultMap>({})

    useEffect(() => {
        if (authLoading) return
        if (!user) router.replace('/login')
    }, [authLoading, router, user])

    useEffect(() => {
        if (!orgId || !user) {
            setPrompts([])
            setVersions({})
            setDrafts({})
            setLoading(false)
            return
        }

        let cancelled = false
        const run = async () => {
            try {
                setLoading(true)
                setError(null)
                const res = await taskaiFetch(`/api/taskai/admin/prompts?orgId=${encodeURIComponent(orgId)}`)
                const json = await res.json()
                if (!json.success) throw new Error(json.message || 'Failed to load prompts')
                const rows = ((json.data.prompts ?? []) as TaskaiPromptTemplate[]).map(normalizePromptTemplate)
                const history = (json.data.versions ?? []) as TaskaiPromptVersion[]
                if (!cancelled) {
                    setPrompts(rows)
                    setVersions(
                        history.reduce<VersionMap>((acc, row) => {
                            if (!acc[row.prompt_key]) acc[row.prompt_key] = []
                            acc[row.prompt_key].push(row)
                            return acc
                        }, {})
                    )
                    setDrafts(Object.fromEntries(rows.map((row) => [row.prompt_key, row.content])))
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Unknown error')
                    setPrompts([])
                    setVersions({})
                    setDrafts({})
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        void run()
        return () => {
            cancelled = true
        }
    }, [orgId, taskaiFetch, user])

    const handleDraftChange = (promptKey: string, value: string) => {
        setDrafts((prev) => ({ ...prev, [promptKey]: value }))
    }

    const toggleHistory = (promptKey: string) => {
        setExpandedHistory((prev) => ({ ...prev, [promptKey]: !prev[promptKey] }))
    }

    const togglePrompt = (promptKey: string) => {
        ensurePreviewInputs(promptKey as TaskaiPromptTemplate['prompt_key'])
        setExpandedPrompts((prev) => ({ ...prev, [promptKey]: !prev[promptKey] }))
    }

    const ensurePreviewInputs = (promptKey: TaskaiPromptTemplate['prompt_key']) => {
        setPreviewInputs((prev) => {
            if (prev[promptKey]) return prev
            return { ...prev, [promptKey]: getDefaultPromptPreviewInputs(promptKey) }
        })
    }

    const handlePreviewInputChange = (promptKey: string, fieldKey: string, value: string) => {
        setPreviewInputs((prev) => ({
            ...prev,
            [promptKey]: {
                ...(prev[promptKey] ?? {}),
                [fieldKey]: value,
            },
        }))
    }

    const handlePreviewFileChange = async (promptKey: string, fieldKey: string, file: File | null) => {
        if (!file) {
            setPreviewUploads((prev) => ({
                ...prev,
                [promptKey]: {
                    ...(prev[promptKey] ?? {}),
                    [fieldKey]: '',
                },
            }))
            handlePreviewInputChange(promptKey, fieldKey, '')
            return
        }

        try {
            const text = (await file.text()).trim()
            setPreviewUploads((prev) => ({
                ...prev,
                [promptKey]: {
                    ...(prev[promptKey] ?? {}),
                    [fieldKey]: file.name,
                },
            }))
            handlePreviewInputChange(promptKey, fieldKey, text)

            if (promptKey === 'taskai_project_document_summary_prompt') {
                const currentTitle = (previewInputs[promptKey]?.documentTitle ?? '').trim()
                if (!currentTitle || currentTitle === 'TaskAI Mobile Launch Brief') {
                    handlePreviewInputChange(
                        promptKey,
                        'documentTitle',
                        file.name.replace(/\.[^.]+$/, '').trim() || file.name
                    )
                }
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not read preview file')
        }
    }

    const refreshFromResponse = (rows: TaskaiPromptTemplate[], history: TaskaiPromptVersion[]) => {
        const normalizedRows = rows.map(normalizePromptTemplate)
        setPrompts(normalizedRows)
        setVersions(
            history.reduce<VersionMap>((acc, row) => {
                if (!acc[row.prompt_key]) acc[row.prompt_key] = []
                acc[row.prompt_key].push(row)
                return acc
            }, {})
        )
        setDrafts(Object.fromEntries(normalizedRows.map((row) => [row.prompt_key, row.content])))
    }

    const handleSave = async (prompt: TaskaiPromptTemplate) => {
        if (!orgId) return
        const nextContent = (drafts[prompt.prompt_key] ?? '').trim()
        if (!nextContent) {
            setError('Prompt content cannot be empty.')
            return
        }

        try {
            setError(null)
            setNotice(null)
            setSaving((prev) => ({ ...prev, [prompt.prompt_key]: true }))
            const res = await taskaiFetch(`/api/taskai/admin/prompts?orgId=${encodeURIComponent(orgId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    promptKey: prompt.prompt_key,
                    content: nextContent,
                }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to save prompt')
            refreshFromResponse(
                (json.data.prompts ?? []) as TaskaiPromptTemplate[],
                (json.data.versions ?? []) as TaskaiPromptVersion[]
            )
            setNotice(`Saved ${prompt.title}.`)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setSaving((prev) => ({ ...prev, [prompt.prompt_key]: false }))
        }
    }

    const handleReset = async (prompt: TaskaiPromptTemplate) => {
        if (!orgId) return
        try {
            setError(null)
            setNotice(null)
            setSaving((prev) => ({ ...prev, [prompt.prompt_key]: true }))
            const res = await taskaiFetch(
                `/api/taskai/admin/prompts?orgId=${encodeURIComponent(orgId)}&promptKey=${encodeURIComponent(prompt.prompt_key)}`,
                { method: 'DELETE' }
            )
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to reset prompt')
            refreshFromResponse(
                (json.data.prompts ?? []) as TaskaiPromptTemplate[],
                (json.data.versions ?? []) as TaskaiPromptVersion[]
            )
            setNotice(`Reset ${prompt.title} to code default.`)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setSaving((prev) => ({ ...prev, [prompt.prompt_key]: false }))
        }
    }

    const handleRollback = async (prompt: TaskaiPromptTemplate, versionId: string) => {
        if (!orgId) return
        try {
            setError(null)
            setNotice(null)
            setSaving((prev) => ({ ...prev, [prompt.prompt_key]: true }))
            const res = await taskaiFetch(`/api/taskai/admin/prompts?orgId=${encodeURIComponent(orgId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    promptKey: prompt.prompt_key,
                    versionId,
                }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to rollback prompt')
            refreshFromResponse(
                (json.data.prompts ?? []) as TaskaiPromptTemplate[],
                (json.data.versions ?? []) as TaskaiPromptVersion[]
            )
            setNotice(`Rolled back ${prompt.title}.`)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setSaving((prev) => ({ ...prev, [prompt.prompt_key]: false }))
        }
    }

    const handlePreviewRun = async (prompt: TaskaiPromptTemplate) => {
        if (!orgId) return
        try {
            setError(null)
            setNotice(null)
            setPreviewLoading((prev) => ({ ...prev, [prompt.prompt_key]: true }))
            const res = await taskaiFetch(`/api/taskai/admin/prompts/preview?orgId=${encodeURIComponent(orgId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    promptKey: prompt.prompt_key,
                    content: drafts[prompt.prompt_key] ?? prompt.content,
                    inputs: previewInputs[prompt.prompt_key] ?? getDefaultPromptPreviewInputs(prompt.prompt_key),
                }),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to test prompt')
            setPreviewResults((prev) => ({ ...prev, [prompt.prompt_key]: json.data as PromptPreviewResult }))
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setPreviewLoading((prev) => ({ ...prev, [prompt.prompt_key]: false }))
        }
    }

    const groupedPrompts = useMemo(() => {
        return {
            conversation: prompts.filter((prompt) => getPromptCategory(prompt) === 'conversation'),
            summary: prompts.filter((prompt) => getPromptCategory(prompt) === 'summary'),
        }
    }, [prompts])

    if (authLoading || membershipsLoading || (ownerMemberships.length > 0 && !orgId)) {
        return (
            <TaskaiPageLoader
                title="Loading Prompt Management..."
                description="Waiting for your admin organization and prompt definitions before rendering this page."
            />
        )
    }

    if (!user) {
        return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-500">Loading...</div>
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-2 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Prompt Management</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Manage the TaskAI runtime prompts used by RTC voice sessions and task summaries.
                    </p>
                </div>
            </div>

            {!orgId ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    No manageable organization yet.
                </p>
            ) : loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading prompt definitions...
                </div>
            ) : (
                <div className="space-y-4">
                    {error ? (
                        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </p>
                    ) : null}
                    {notice ? (
                        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {notice}
                        </p>
                    ) : null}

                    {(['conversation', 'summary'] as const).map((sectionKey) => {
                        const sectionPrompts = groupedPrompts[sectionKey]
                        if (!sectionPrompts.length) return null

                        return (
                            <section key={sectionKey} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-800">
                                            {getPromptCategoryLabel(sectionKey)}
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            {sectionKey === 'conversation'
                                                ? 'Prompts used during live TaskAI RTC conversation startup.'
                                                : 'Prompts used after the AI chat to generate summary output and key points.'}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                        {sectionPrompts.length} item{sectionPrompts.length > 1 ? 's' : ''}
                                    </span>
                                </div>

                                {sectionPrompts.map((prompt) => {
                                    const isSaving = !!saving[prompt.prompt_key]
                                    const draft = drafts[prompt.prompt_key] ?? ''
                                    const isDirty = draft !== prompt.content
                                    const isExpanded = !!expandedPrompts[prompt.prompt_key]
                                    const promptVersions = versions[prompt.prompt_key] ?? []
                                    const runtimeContextLabel = prompt.runtime_context_label ?? null
                                    const runtimeContextDescription = prompt.runtime_context_description ?? null
                                    const runtimeContextTemplate = prompt.runtime_context_template ?? null
                                    const runtimeContextPlaceholders = Array.isArray(prompt.runtime_context_placeholders)
                                        ? prompt.runtime_context_placeholders
                                        : []
                                    const previewFields = getPromptPreviewFields(prompt.prompt_key)
                                    const currentPreviewInputs =
                                        previewInputs[prompt.prompt_key] ?? getDefaultPromptPreviewInputs(prompt.prompt_key)
                                    const previewResult = previewResults[prompt.prompt_key] ?? null
                                    const isPreviewLoading = !!previewLoading[prompt.prompt_key]

                                    return (
                                        <section
                                            key={prompt.prompt_key}
                                            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
                                        >
                                            <div
                                                className={`flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start lg:justify-between ${
                                                    isExpanded ? 'border-b border-slate-200' : ''
                                                }`}
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                                                            <Bot className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-base font-semibold text-slate-800">
                                                                {prompt.title}
                                                            </h4>
                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {prompt.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePrompt(prompt.prompt_key)}
                                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronUp className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4" />
                                                        )}
                                                        {isExpanded ? 'Hide Prompt' : 'Edit Prompt'}
                                                    </button>
                                                    {isExpanded ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleReset(prompt)}
                                                                disabled={isSaving}
                                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                <RotateCcw className="h-4 w-4" />
                                                                Reset to Default
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleSave(prompt)}
                                                                disabled={isSaving || !isDirty}
                                                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                {isSaving ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Save className="h-4 w-4" />
                                                                )}
                                                                Save
                                                            </button>
                                                        </>
                                                    ) : null}
                                                </div>
                                            </div>
                                            {isExpanded ? (
                                                <div className="px-5 py-4">
                                                <textarea
                                                    value={draft}
                                                    onChange={(e) => handleDraftChange(prompt.prompt_key, e.target.value)}
                                                    className="min-h-[280px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white"
                                                    spellCheck={false}
                                                />

                                                {runtimeContextTemplate ? (
                                                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                                        <div>
                                                            <h5 className="text-sm font-semibold text-slate-800">
                                                                {runtimeContextLabel || 'Readonly Runtime Context'}
                                                            </h5>
                                                            {runtimeContextDescription ? (
                                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                                    {runtimeContextDescription}
                                                                </p>
                                                            ) : null}
                                                            <p className="mt-2 text-xs font-medium text-slate-500">
                                                                This block is shown for visibility only and cannot be edited here.
                                                            </p>
                                                            {runtimeContextPlaceholders.length ? (
                                                                <p className="mt-2 text-xs text-slate-500">
                                                                    Placeholders: {runtimeContextPlaceholders.join(', ')}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                        <textarea
                                                            value={runtimeContextTemplate}
                                                            readOnly
                                                            className="mt-4 min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-700 outline-none"
                                                            spellCheck={false}
                                                        />
                                                    </div>
                                                ) : null}

                                                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                        <div>
                                                            <h5 className="text-sm font-semibold text-slate-800">
                                                                Test Prompt
                                                            </h5>
                                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                                Fill in sample runtime values, run the current draft once,
                                                                and preview the resolved prompt or model output before saving.
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => void handlePreviewRun(prompt)}
                                                            disabled={isPreviewLoading}
                                                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {isPreviewLoading ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <FlaskConical className="h-4 w-4" />
                                                            )}
                                                            Test Run
                                                        </button>
                                                    </div>

                                                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                                                        <div className="space-y-3">
                                                            {previewFields.map((field) => (
                                                                <label key={field.key} className="block">
                                                                    <span className="mb-1.5 block text-xs font-medium text-slate-600">
                                                                        {field.label}
                                                                    </span>
                                                                    {field.type === 'textarea' ? (
                                                                        <textarea
                                                                            value={currentPreviewInputs[field.key] ?? ''}
                                                                            onChange={(e) =>
                                                                                handlePreviewInputChange(
                                                                                    prompt.prompt_key,
                                                                                    field.key,
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            rows={field.rows ?? 5}
                                                                            placeholder={field.placeholder}
                                                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400"
                                                                            spellCheck={false}
                                                                        />
                                                                    ) : field.type === 'file' ? (
                                                                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                                                                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100">
                                                                                <FileUp className="h-4 w-4" />
                                                                                Upload Document
                                                                                <input
                                                                                    type="file"
                                                                                    accept=".txt,.md,.markdown,.json,.csv,.tsv,.html,.xml,text/*"
                                                                                    className="hidden"
                                                                                    onChange={(e) =>
                                                                                        void handlePreviewFileChange(
                                                                                            prompt.prompt_key,
                                                                                            field.key,
                                                                                            e.target.files?.[0] ?? null
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </label>
                                                                            <p className="mt-3 text-xs leading-5 text-slate-500">
                                                                                {previewUploads[prompt.prompt_key]?.[field.key]
                                                                                    ? `Selected file: ${previewUploads[prompt.prompt_key]?.[field.key]}`
                                                                                    : 'Upload a text-based file. The extracted content will be used for this preview run.'}
                                                                            </p>
                                                                            {currentPreviewInputs[field.key]?.trim() ? (
                                                                                <p className="mt-2 text-xs text-slate-400">
                                                                                    Document content is ready for testing.
                                                                                </p>
                                                                            ) : null}
                                                                        </div>
                                                                    ) : (
                                                                        <input
                                                                            value={currentPreviewInputs[field.key] ?? ''}
                                                                            onChange={(e) =>
                                                                                handlePreviewInputChange(
                                                                                    prompt.prompt_key,
                                                                                    field.key,
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            placeholder={field.placeholder}
                                                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400"
                                                                        />
                                                                    )}
                                                                </label>
                                                            ))}
                                                        </div>

                                                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                                            <h6 className="text-sm font-semibold text-slate-800">
                                                                Preview Result
                                                            </h6>
                                                            {!previewResult ? (
                                                                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                                                                    No preview yet. Enter sample inputs and click Test Run.
                                                                </div>
                                                            ) : (
                                                                <div className="mt-3 space-y-4">
                                                                    {previewResult.runtimeUserPrompt ? (
                                                                        <div>
                                                                            <p className="text-xs font-medium text-slate-500">
                                                                                Runtime User Prompt
                                                                            </p>
                                                                            <textarea
                                                                                value={previewResult.runtimeUserPrompt}
                                                                                readOnly
                                                                                className="mt-2 min-h-[150px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs leading-5 text-slate-700 outline-none"
                                                                                spellCheck={false}
                                                                            />
                                                                        </div>
                                                                    ) : null}

                                                                    {previewResult.composedPrompt ? (
                                                                        <div>
                                                                            <p className="text-xs font-medium text-slate-500">
                                                                                Final Prompt Sent to RTC
                                                                            </p>
                                                                            <textarea
                                                                                value={previewResult.composedPrompt}
                                                                                readOnly
                                                                                className="mt-2 min-h-[220px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs leading-5 text-slate-700 outline-none"
                                                                                spellCheck={false}
                                                                            />
                                                                        </div>
                                                                    ) : null}

                                                                    {previewResult.parsedResult ? (
                                                                        <div className="space-y-4">
                                                                            {'summary' in previewResult.parsedResult ? (
                                                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                                                    <p className="text-xs font-medium text-slate-500">
                                                                                        {prompt.prompt_key === 'taskai_project_document_summary_prompt'
                                                                                            ? 'Document Summary Preview'
                                                                                            : 'Summary Preview'}
                                                                                    </p>
                                                                                    <p className="mt-2 text-sm leading-6 text-slate-700">
                                                                                        {String(previewResult.parsedResult.summary ?? '')}
                                                                                    </p>
                                                                                </div>
                                                                            ) : null}

                                                                            {prompt.prompt_key !== 'taskai_project_document_summary_prompt'
                                                                                && Array.isArray(previewResult.parsedResult.key_points) ? (
                                                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                                                    <p className="text-xs font-medium text-slate-500">
                                                                                        Key Points
                                                                                    </p>
                                                                                    <div className="mt-3 space-y-2">
                                                                                        {previewResult.parsedResult.key_points.map((item, index) => {
                                                                                            const row = (item ?? {}) as Record<string, unknown>
                                                                                            return (
                                                                                                <div key={index} className="rounded-lg bg-white px-3 py-2">
                                                                                                    <p className="text-sm font-medium text-slate-800">
                                                                                                        {String(row.point ?? `Point ${index + 1}`)}
                                                                                                    </p>
                                                                                                    <p className="mt-1 text-xs leading-5 text-slate-600">
                                                                                                        {String(row.detail ?? '')}
                                                                                                    </p>
                                                                                                </div>
                                                                                            )
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            ) : null}

                                                                            {prompt.prompt_key !== 'taskai_project_document_summary_prompt'
                                                                                && Array.isArray(previewResult.parsedResult.constraints) ? (
                                                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                                                    <p className="text-xs font-medium text-slate-500">
                                                                                        Constraints
                                                                                    </p>
                                                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                                                        {previewResult.parsedResult.constraints.map((item, index) => (
                                                                                            <span
                                                                                                key={index}
                                                                                                className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700"
                                                                                            >
                                                                                                {String(item ?? '')}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            ) : null}

                                                                            {prompt.prompt_key !== 'taskai_project_document_summary_prompt'
                                                                                && Array.isArray(previewResult.parsedResult.recommended_focus) ? (
                                                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                                                    <p className="text-xs font-medium text-slate-500">
                                                                                        Recommended Focus
                                                                                    </p>
                                                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                                                        {previewResult.parsedResult.recommended_focus.map((item, index) => (
                                                                                            <span
                                                                                                key={index}
                                                                                                className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700"
                                                                                            >
                                                                                                {String(item ?? '')}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            ) : null}

                                                                            {Array.isArray(previewResult.parsedResult.tasks) ? (
                                                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                                                    <p className="text-xs font-medium text-slate-500">
                                                                                        Generated Task Preview
                                                                                    </p>
                                                                                    <div className="mt-3 space-y-3">
                                                                                        {previewResult.parsedResult.tasks.map((item, index) => {
                                                                                            const row = (item ?? {}) as Record<string, unknown>
                                                                                            return (
                                                                                                <div key={index} className="rounded-xl bg-white p-4">
                                                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                                                        <p className="text-sm font-semibold text-slate-800">
                                                                                                            {String(row.title ?? `Task ${index + 1}`)}
                                                                                                        </p>
                                                                                                        {row.category ? (
                                                                                                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                                                                                                                {String(row.category)}
                                                                                                            </span>
                                                                                                        ) : null}
                                                                                                        {row.points ? (
                                                                                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                                                                                {String(row.points)} pts
                                                                                                            </span>
                                                                                                        ) : null}
                                                                                                        {row.type ? (
                                                                                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                                                                                {String(row.type)}
                                                                                                            </span>
                                                                                                        ) : null}
                                                                                                    </div>
                                                                                                    {row.description ? (
                                                                                                        <p className="mt-2 text-sm leading-6 text-slate-700">
                                                                                                            {String(row.description)}
                                                                                                        </p>
                                                                                                    ) : null}
                                                                                                    {row.reason ? (
                                                                                                        <p className="mt-2 text-xs leading-5 text-slate-500">
                                                                                                            Reason: {String(row.reason)}
                                                                                                        </p>
                                                                                                    ) : null}
                                                                                                </div>
                                                                                            )
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            ) : null}

                                                                            <div>
                                                                                <p className="text-xs font-medium text-slate-500">
                                                                                    Raw Parsed JSON
                                                                                </p>
                                                                                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs leading-5 text-slate-700">
                                                                                    {JSON.stringify(previewResult.parsedResult, null, 2)}
                                                                                </pre>
                                                                            </div>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <h5 className="text-sm font-semibold text-slate-800">Version History</h5>
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                Recent saved, reset, and rollback records for this prompt.
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleHistory(prompt.prompt_key)}
                                                            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                                                        >
                                                            {promptVersions.length} record{promptVersions.length === 1 ? '' : 's'}
                                                            {expandedHistory[prompt.prompt_key] ? (
                                                                <ChevronUp className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </div>

                                                    {expandedHistory[prompt.prompt_key] ? (
                                                        promptVersions.length ? (
                                                            <div className="mt-4 space-y-3">
                                                                {promptVersions.map((version) => {
                                                                    const isCurrentSnapshot =
                                                                        version.result_source === prompt.source
                                                                        && version.content === prompt.content
                                                                    const canRollback = !isSaving && !isCurrentSnapshot

                                                                    return (
                                                                        <div
                                                                            key={version.id}
                                                                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                                                        >
                                                                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                                                <div className="space-y-2">
                                                                                    <div className="flex flex-wrap gap-2 text-xs">
                                                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                                                                            {getPromptVersionActionLabel(version.action)}
                                                                                        </span>
                                                                                        <span
                                                                                            className={`rounded-full px-2.5 py-1 font-medium ${
                                                                                                version.result_source === 'database'
                                                                                                    ? 'bg-amber-100 text-amber-800'
                                                                                                    : 'bg-emerald-100 text-emerald-800'
                                                                                            }`}
                                                                                        >
                                                                                            result: {version.result_source}
                                                                                        </span>
                                                                                        {isCurrentSnapshot ? (
                                                                                            <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-medium text-indigo-800">
                                                                                                current live version
                                                                                            </span>
                                                                                        ) : null}
                                                                                    </div>
                                                                                    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                                                                                        <span>
                                                                                            at:{' '}
                                                                                            {formatTaskaiDateTime(version.created_at)}
                                                                                        </span>
                                                                                        <span>by: {version.created_by || 'n/a'}</span>
                                                                                        {version.restored_from_version_id ? (
                                                                                            <span>
                                                                                                restored from: {version.restored_from_version_id}
                                                                                            </span>
                                                                                        ) : null}
                                                                                    </div>
                                                                                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs leading-5 text-slate-700">
                                                                                        {version.content}
                                                                                    </pre>
                                                                                </div>

                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => void handleRollback(prompt, version.id)}
                                                                                    disabled={!canRollback}
                                                                                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                                                >
                                                                                    {isSaving ? (
                                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                                    ) : (
                                                                                        <RotateCcw className="h-4 w-4" />
                                                                                    )}
                                                                                    Rollback to This Version
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-4 text-xs text-slate-500">
                                                                No version records yet. The first save, reset, or rollback will create one.
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-4 text-xs text-slate-500">
                                                            Version history is hidden by default. Click the record button above to expand it.
                                                        </div>
                                                    )}
                                                </div>
                                                </div>
                                            ) : null}
                                        </section>
                                    )
                                })}
                            </section>
                        )
                    })}

                    {!prompts.length ? (
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
                            No prompts available right now.
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}
