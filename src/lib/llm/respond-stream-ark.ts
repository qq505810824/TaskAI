type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

function requireEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is missing.`);
    }
    return value;
}

function extractModelText(payload: unknown): string {
    if (!payload || typeof payload !== 'object') {
        throw new Error('ARK returned an invalid response.');
    }

    const root = payload as {
        choices?: Array<{
            message?: {
                content?:
                    | string
                    | Array<{
                          type?: string;
                          text?: string;
                      }>;
            };
        }>;
    };

    const content = root.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) {
        return content.trim();
    }

    if (Array.isArray(content)) {
        const text = content
            .filter((item) => item?.type === 'text' && typeof item.text === 'string')
            .map((item) => item.text?.trim() ?? '')
            .filter(Boolean)
            .join('\n');

        if (text) {
            return text;
        }
    }

    throw new Error('ARK returned an empty reply.');
}

function buildSystemPrompt(topic: string) {
    // 对齐 speaking-avatar 的提示词策略
    return [
        'You are an English conversation tutor represented by a friendly classroom avatar.',
        'Reply in natural spoken English.',
        'Keep each answer within 2 very short sentences plus 1 short follow-up question.',
        'Stay on the requested lesson topic unless the student drifts too far.',
        'Gently correct obvious grammar or vocabulary mistakes by modeling the better sentence.',
        'Use concise spoken phrasing for fast audio playback.',
        `Lesson topic: ${topic}.`,
    ].join(' ');
}

export async function respondFromTextWithRespondStreamStyle(params: {
    topic: string;
    userText: string;
    // 未来可扩展：history
}): Promise<{ aiText: string; llmMs: number }> {
    const apiKey = requireEnv('ARK_API_KEY');
    const model = requireEnv('ARK_MODEL_ID');
    const baseUrl = process.env.ARK_BASE_URL?.trim() || 'https://ark.ap-southeast.bytepluses.com/api/v3';

    const requestStartedAt = Date.now();

    const messages: ChatMessage[] = [
        { role: 'system', content: buildSystemPrompt(params.topic || '') },
        { role: 'user', content: params.userText },
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            temperature: 0.6,
            max_tokens: 140,
            messages,
        }),
    });

    const payload = (await response.json()) as unknown;

    if (!response.ok) {
        const details =
            payload && typeof payload === 'object' ? JSON.stringify(payload) : response.statusText;
        throw new Error(`ModelArk request failed: ${details}`);
    }

    const aiText = extractModelText(payload);
    const llmMs = Date.now() - requestStartedAt;
    return { aiText, llmMs };
}

