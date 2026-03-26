import type { DifyConfig, DifyLlmRequest, DifyLlmResponse } from './types';

/**
 * DifyClient：前端只调用本项目的后端 API（例如 `/api/llm/chat`），
 * 由后端负责真正访问 Dify 服务，前端不暴露 Dify URL 或 API Key。
 */
export class DifyClient {
    private config: DifyConfig;
    private conversationId?: string;

    constructor(config: DifyConfig) {
        this.config = config;
    }

    private getApiPath() {
        return this.config.apiPath || '/api/llm/chat';
    }

    async chat(req: DifyLlmRequest): Promise<DifyLlmResponse> {
        const res = await fetch(this.getApiPath(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: req.userId,
                text: req.userText,
                title: req.title || '',
                topic: req.topic || '',
                hints: req.hints || '',
                conversationId: this.conversationId,
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`LLM API request failed: ${res.status} ${res.statusText} - ${text}`);
        }

        const data = await res.json();

        // 兼容 ApiResponse 包裹结构
        const payload = data?.data || data;

        const conversationId: string = payload?.conversation_id || '';
        const aiText: string = payload?.aiText || payload?.ai_response_text || payload?.answer || '';

        // 从一次调用开始到结束期间，持续复用同一个 conversationId
        if (conversationId) {
            this.conversationId = conversationId;
        }

        return {
            conversationId: this.conversationId || '',
            aiText: aiText || '',
            raw: data,
        };
    }
}


