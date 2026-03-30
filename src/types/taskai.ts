export type TaskaiOrgMemberRole = 'owner' | 'member';

export type TaskaiTaskStatus = 'open' | 'in_progress' | 'completed';

export type TaskaiTaskType = 'one_time' | 'recurring';

export type TaskaiRecurringFrequency = 'daily' | 'weekly' | 'monthly';

export type TaskaiNotificationChannel = 'whatsapp' | 'telegram';

export type TaskaiPromptKey =
    | 'taskai_rtc_tutor_template'
    | 'taskai_ai_chat_summary_prompt'
    | 'taskai_project_document_summary_prompt'
    | 'taskai_generate_todos_from_project_and_objective';

export type TaskaiPromptService = 'volc_rtc_s2s' | 'ark_chat_completions';
export type TaskaiPromptVersionAction = 'saved' | 'reset_to_default' | 'rolled_back';
export type TaskaiPromptVersionSource = 'default' | 'database';
export type TaskaiObjectiveStatus = 'draft' | 'active' | 'archived';
export type TaskaiContextDocumentScope = 'organization' | 'project' | 'objective';
export type TaskaiDocumentSummaryStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type TaskaiTaskGenerationProvider = 'ark' | 'dify';
export type TaskaiTaskGenerationStatus = 'pending' | 'running' | 'ready' | 'failed' | 'published';

export type TaskaiChannelConnectionStatus = 'pending' | 'active' | 'paused' | 'revoked';

export type TaskaiNotificationEventType =
    | 'task_new_available'
    | 'task_claimed'
    | 'task_claimed_no_ai_started'
    | 'task_claimed_stalled'
    | 'task_completed_encourage'
    | 'leaderboard_rank_up'
    | 'points_milestone'
    | 'test_message'
    | 'binding_verification_code';

export type TaskaiNotificationJobStatus = 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'skipped';

export type TaskaiWhatsappVerificationStatus = 'pending' | 'verified' | 'expired' | 'cancelled';

export interface TaskaiMembership {
    id: string;
    org_id: string;
    role: TaskaiOrgMemberRole;
    points_balance: number;
    points_earned_total: number;
    organization: {
        id: string;
        name: string;
        description: string | null;
        /** 9-digit team invite code (set when org is created) */
        invite_code: string | null;
        points_pool_total: number | null;
        points_pool_remaining: number | null;
    };
}

export interface TaskaiTaskRow {
    id: string;
    org_id: string;
    goal_id: string | null;
    project_id?: string | null;
    title: string;
    description: string | null;
    project_name?: string | null;
    points: number;
    type: TaskaiTaskType;
    recurring_frequency: TaskaiRecurringFrequency | null;
    status: TaskaiTaskStatus;
    category: string | null;
    assignee_user_id: string | null;
    created_at: string;
    updated_at: string;
    /** joined in API */
    assignee_display_name?: string | null;
}

export interface TaskaiProjectRow {
    id: string;
    org_id: string;
    name: string;
    objective: string | null;
    description: string | null;
    status: TaskaiObjectiveStatus;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface TaskaiContextDocumentRow {
    id: string;
    org_id: string;
    project_id: string | null;
    scope: TaskaiContextDocumentScope;
    project_name: string | null;
    title: string;
    file_name: string;
    mime_type: string | null;
    storage_bucket: string;
    storage_path: string;
    file_size: number | null;
    raw_text: string | null;
    summary: string | null;
    summary_payload: Record<string, unknown>;
    summary_status: TaskaiDocumentSummaryStatus;
    summary_error: string | null;
    uploaded_by: string;
    created_at: string;
    updated_at: string;
}

export interface TaskaiTaskGenerationRun {
    id: string;
    org_id: string;
    project_id: string | null;
    provider: TaskaiTaskGenerationProvider;
    prompt_key: TaskaiPromptKey;
    model_target: string | null;
    status: TaskaiTaskGenerationStatus;
    input_payload: Record<string, unknown>;
    output_payload: Record<string, unknown>;
    error_message: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface TaskaiTaskGenerationRunItem {
    id: string;
    run_id: string;
    sort_order: number;
    title: string;
    description: string | null;
    points: number;
    type: TaskaiTaskType;
    recurring_frequency: TaskaiRecurringFrequency | null;
    category: string | null;
    source_payload: Record<string, unknown>;
    published_task_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface TaskaiTaskContextSnapshot {
    task_id: string;
    org_id: string;
    project_id: string | null;
    generation_run_id: string | null;
    project_snapshot: Record<string, unknown>;
    document_summary_snapshot: Record<string, unknown>;
    objective_id?: string | null;
    objective_snapshot?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface TaskaiChannelConnection {
    id: string;
    user_id: string;
    channel: TaskaiNotificationChannel;
    phone_number: string | null;
    normalized_phone_number: string | null;
    status: TaskaiChannelConnectionStatus;
    verified_at: string | null;
    last_seen_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface TaskaiNotificationPreferences {
    id: string;
    user_id: string;
    channel: TaskaiNotificationChannel;
    enabled: boolean;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
    allow_new_task: boolean;
    allow_task_claimed: boolean;
    allow_claim_reminder: boolean;
    allow_stalled_task: boolean;
    allow_completion_message: boolean;
    allow_rank_milestone: boolean;
    created_at: string;
    updated_at: string;
}

export interface TaskaiNotificationJob {
    id: string;
    org_id: string | null;
    user_id: string;
    task_id: string | null;
    channel: TaskaiNotificationChannel;
    event_type: TaskaiNotificationEventType;
    template_key: string;
    dedupe_key: string;
    payload: Record<string, unknown>;
    rendered_message: string | null;
    status: TaskaiNotificationJobStatus;
    scheduled_for: string;
    claimed_at: string | null;
    sent_at: string | null;
    failed_at: string | null;
    cancelled_at: string | null;
    retry_count: number;
    provider: string | null;
    provider_message_id: string | null;
    error_message: string | null;
    response_payload: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface TaskaiWhatsappVerification {
    id: string;
    user_id: string;
    channel: 'whatsapp';
    phone_number: string;
    normalized_phone_number: string;
    verification_code: string;
    status: TaskaiWhatsappVerificationStatus;
    requested_at: string;
    expires_at: string;
    verified_at: string | null;
    verified_from_jid: string | null;
    verified_message_id: string | null;
    last_attempted_at: string | null;
    attempt_count: number;
    created_at: string;
    updated_at: string;
}

export interface TaskaiPromptTemplate {
    prompt_key: TaskaiPromptKey;
    title: string;
    description: string;
    service: TaskaiPromptService;
    model_target: string;
    placeholders: string[];
    placeholder_rules: string;
    required_inputs: string[];
    runtime_context_label?: string | null;
    runtime_context_description?: string | null;
    runtime_context_template?: string | null;
    runtime_context_placeholders?: string[];
    content: string;
    source: 'default' | 'database';
    updated_at: string | null;
    updated_by: string | null;
}

export interface TaskaiPromptVersion {
    id: string;
    prompt_key: TaskaiPromptKey;
    content: string;
    result_source: TaskaiPromptVersionSource;
    action: TaskaiPromptVersionAction;
    created_at: string;
    created_by: string | null;
    restored_from_version_id: string | null;
}
