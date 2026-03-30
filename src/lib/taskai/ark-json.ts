import { parseJsonObjectFromLlmText } from '@/lib/meeting/generate-summary-todos-llm';
import { getTaskaiPromptContent } from '@/lib/taskai/prompt-templates';
import type { TaskaiPromptKey } from '@/types/taskai';

function requireEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} is not configured`);
    return value;
}

function extractModelText(payload: unknown): string {
    const root = payload as {
        choices?: Array<{
            message?: {
                content?: string | Array<{ type?: string; text?: string }>;
            };
        }>;
    };

    const content = root.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) return content.trim();
    if (Array.isArray(content)) {
        const text = content
            .filter((x) => x?.type === 'text' && typeof x.text === 'string')
            .map((x) => x.text?.trim() ?? '')
            .filter(Boolean)
            .join('\n');
        if (text) return text;
    }
    throw new Error('Model returned empty reply');
}

export async function runTaskaiArkJsonPrompt<T>(params: {
    promptKey: TaskaiPromptKey;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
}): Promise<T> {
    const systemPrompt = await getTaskaiPromptContent(params.promptKey);

    return runTaskaiArkJsonPromptWithSystemPrompt<T>({
        systemPrompt,
        userPrompt: params.userPrompt,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
    });
}

export async function runTaskaiArkJsonPromptWithSystemPrompt<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
}): Promise<T> {
    const apiKey = requireEnv('ARK_API_KEY');
    const model = requireEnv('ARK_MODEL_ID');
    const baseUrl = process.env.ARK_BASE_URL?.trim() || 'https://ark.ap-southeast.bytepluses.com/api/v3';

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            temperature: params.temperature ?? 0.2,
            max_tokens: params.maxTokens ?? 2500,
            messages: [
                { role: 'system', content: params.systemPrompt },
                { role: 'user', content: params.userPrompt },
            ],
        }),
    });

    const payload = (await response.json()) as unknown;
    if (!response.ok) {
        throw new Error(`ARK chat/completions failed: ${JSON.stringify(payload)}`);
    }

    const rawText = extractModelText(payload);
    return parseJsonObjectFromLlmText(rawText) as T;
}
