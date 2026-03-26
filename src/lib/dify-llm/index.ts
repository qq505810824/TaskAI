import type { LlmHandler, LlmRequest, LlmResponse } from '@/lib/aliyun-asr';
import { DifyClient } from './client';
import type { DifyConfig, DifyLlmRequest } from './types';

export * from './types';

export function createDifyLlmHandler(config: DifyConfig = {}): LlmHandler {
    const client = new DifyClient(config);

    const handler: LlmHandler = async (req: LlmRequest): Promise<LlmResponse> => {
        const meta = req.meta || {};

        const difyReq: DifyLlmRequest = {
            userId: meta.userId || 'anonymous',
            userText: req.userText,
            title: meta.title,
            topic: meta.topic,
            hints: meta.hints,
        };

        const res = await client.chat(difyReq);

        return {
            conversationId: res.conversationId,
            aiText: res.aiText,
            raw: res.raw,
        };
    };

    return handler;
}

