'use client'

import { useTaskaiApi } from '@/hooks/useTaskaiApi'
import { useCallback, useEffect, useState } from 'react'

export type TaskaiTaskSummary = {
    id: string
    task_id: string
    org_id: string
    generated_by: string
    summary: string
    key_points: Array<{ point: string; detail: string }>
    generated_at: string
    updated_at: string
} | null

export type TaskaiTaskConversationRow = {
    id: string
    task_id: string
    org_id: string
    user_id: string
    user_message_text: string
    ai_response_text: string
    user_sent_at: string
    ai_responded_at: string
    created_at: string
}

export type TaskaiTaskCompletionEvidenceRow = {
    id: string
    task_id: string
    org_id: string
    user_id: string
    evidence_type: 'text' | 'file'
    text_content: string | null
    file_name: string | null
    mime_type: string | null
    storage_bucket: string | null
    storage_path: string | null
    file_size: number | null
    created_at: string
    updated_at: string
    view_url?: string | null
}

export type TaskaiTaskRecordTask = {
    id: string
    org_id: string
    assignee_user_id: string | null
    status: 'open' | 'in_progress' | 'completed'
    title: string
    description: string | null
    project_name?: string | null
} | null

export function useTaskaiTaskRecords(taskId: string | null) {
    const { taskaiFetch } = useTaskaiApi()
    const [task, setTask] = useState<TaskaiTaskRecordTask>(null)
    const [summary, setSummary] = useState<TaskaiTaskSummary>(null)
    const [conversations, setConversations] = useState<TaskaiTaskConversationRow[]>([])
    const [evidence, setEvidence] = useState<TaskaiTaskCompletionEvidenceRow[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const refresh = useCallback(async () => {
        if (!taskId) {
            setTask(null)
            setSummary(null)
            setConversations([])
            setEvidence([])
            return
        }
        setLoading(true)
        setError(null)
        try {
            const res = await taskaiFetch(`/api/taskai/tasks/${taskId}/records`)
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to load task records')
            setTask((json.data?.task ?? null) as TaskaiTaskRecordTask)
            setSummary((json.data?.summary ?? null) as TaskaiTaskSummary)
            setConversations((json.data?.conversations ?? []) as TaskaiTaskConversationRow[])
            setEvidence((json.data?.evidence ?? []) as TaskaiTaskCompletionEvidenceRow[])
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
            setTask(null)
            setSummary(null)
            setConversations([])
            setEvidence([])
        } finally {
            setLoading(false)
        }
    }, [taskId, taskaiFetch])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { task, summary, conversations, evidence, loading, error, refresh }
}
