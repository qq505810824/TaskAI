// 平台信息类型
export interface PlatformInfo {
    platform: 'telegram' | 'whatsapp' | 'web' | 'other';
    platform_user_id: string;
    platform_username: string | null;
    platform_display_name: string | null;
    created_at: string;
}

// 用户meta类型（只支持单个平台）
export interface UserMeta {
    platform: PlatformInfo;
}

// 用户类型
export interface User {
    id: string;
    email: string | null;
    name: string | null;
    role: 'admin' | 'user';
    avatar_url: string | null;
    meta: UserMeta;
    created_at: string;
    updated_at: string;
}

// 会议类型
export interface Meet {
    id: string;
    meeting_code: string;
    title: string;
    description: string | null;
    taskai_project_document_summary?: string | null;
    taskai_current_task_summary?: string | null;
    taskai_project_task_overview?: string | null;
    host_id: string;
    start_time: string | null;
    duration: number | null;
    status: 'pending' | 'ongoing' | 'ended' | 'cancelled';
    join_url: string;
    created_at: string;
    updated_at: string;
    ended_at: string | null;
}

// 对话记录类型
export interface Conversation {
    id: string;
    meet_id: string;
    user_id: string;
    user_meet_id?: string;
    user_audio_url: string;
    user_message_text: string;
    user_audio_duration: number | null;
    ai_response_text: string;
    ai_audio_url?: string | null;
    ai_audio_duration?: number | null;
    user_sent_at: string;
    ai_responded_at: string;
    created_at: string;
}

// 任务类型
export interface Todo {
    id: string;
    meet_id: string;
    user_meet_id?: string;
    title: string;
    description: string | null;
    assignee_id: string | null;
    status: 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    due_date: string | null;
    reminder_time: string | null;
    source: 'ai_generated' | 'manual';
    created_at: string;
    updated_at: string;
    completed_at: string | null;
}

// 会议总结类型
export interface MeetSummary {
    id: string;
    meet_id: string;
    user_meet_id?: string;
    summary: string;
    key_points: Array<{
        point: string;
        detail: string;
    }>;
    participants: Array<{
        user_id: string;
        name: string;
        role: string;
    }>;
    generated_at: string;
}

// API响应类型
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// 创建会议请求
export interface CreateMeetRequest {
    title: string;
    description?: string;
    startTime: string;
    duration: number;
    hostId: string;
}

// 发送消息请求
export interface SendMessageRequest {
    meetId: string;
    userId: string;
    userMeetId?: string;
    audioUrl: string;
    title?: string;
    topic?: string;
    hints?: string;
    description?: string;
    projectDocumentSummary?: string;
    currentTaskSummary?: string;
    projectTaskOverview?: string;
    transcriptionText: string;
    conversation_id?: string; // Dify conversation_id，可选，第一次对话时为空
    audioDuration: number;
}

// 用户识别请求
export interface IdentifyUserRequest {
    platform: 'telegram' | 'whatsapp' | 'web';
    platformUserId: string;
    platformUsername?: string;
    platformDisplayName?: string;
}

// TTS生成请求
export interface TTSGenerateRequest {
    text: string;
    voice?: string;
    language?: string;
}
