export type AsrLanguage = 'zh' | 'en' | string;

export interface AsrConfig {
    language?: AsrLanguage;
    sampleRate?: number;
    format?: 'pcm' | string;
}

export interface AsrError {
    code?: string;
    message: string;
    raw?: any;
}

export type AsrStatus =
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'recording'
    | 'listening'
    | 'processing'
    | 'speaking'
    | 'error';

export interface UtteranceRecord {
    id: string;
    userText: string;
    aiText: string;
    userAudioDuration: number; // 秒
    userSentAt: string; // ISO
    aiRespondedAt: string; // ISO
    /** 用户本句录音的可播放地址，如 data:audio/webm;base64,... 便于回放 */
    user_audio_url?: string;
}

export interface ConversationSessionState {
    id: string;
    utterances: UtteranceRecord[];
}

export interface LlmRequest {
    userText: string;
    meta?: {
        userId?: string;
        title?: string;
        topic?: string;
        hints?: string;
    };
}

export interface LlmResponse {
    conversationId: string;
    aiText: string;
    raw?: any;
}

export type LlmHandler = (req: LlmRequest) => Promise<LlmResponse>;

export interface TtsConfig {
    voice?: string;
}

export type TtsHandler = (text: string, config?: TtsConfig) => Promise<string>;

export type AudioPlayer = (audioUrl: string) => Promise<void>;

