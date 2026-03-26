export interface DifyConfig {
    /**
     * 后端调用 Dify 的 API 路由路径，默认 `/api/llm/chat`
     * 前端不直接暴露 Dify URL 或 API Key。
     */
    apiPath?: string;
}

export interface DifyLlmRequest {
    userId: string;
    userText: string;
    title?: string;
    topic?: string;
    hints?: string;
}

export interface DifyLlmResponse {
    conversationId: string;
    aiText: string;
    raw?: any;
}

