import { buildTranscriptFromConversations, parseJsonObjectFromLlmText } from '@/lib/meeting/generate-summary-todos-llm';

type SummaryPayload = {
    summary: string;
    key_points: Array<{ point: string; detail: string }>;
};

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

function normalizeKeyPoints(raw: unknown): Array<{ point: string; detail: string }> {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            const o = (item ?? {}) as Record<string, unknown>;
            return {
                point: String(o.point ?? '').trim(),
                detail: String(o.detail ?? '').trim(),
            };
        })
        .filter((x) => x.point || x.detail)
        .slice(0, 8);
}

const SYSTEM_PROMPT = [
    'You are an assistant for TaskAI task session summarization.',
    'Return ONLY strict JSON with this exact shape:',
    '{"summary": string, "key_points": [{"point": string, "detail": string}]}',
    'No markdown code fences, no extra text.',
    'Do not include todos or action lists.',
    'Do not hallucinate facts not in transcript.',
].join('\n');

export async function generateTaskSummaryFromConversations(params: {
    taskTitle: string;
    taskDescription?: string | null;
    rows: Array<{ user_message_text?: string | null; ai_response_text?: string | null }>;
    language?: 'zh' | 'en';
}): Promise<SummaryPayload> {
    const transcript = buildTranscriptFromConversations(params.rows);
    if (!transcript.trim()) throw new Error('Conversation text is empty');

    const apiKey = requireEnv('ARK_API_KEY');
    const model = requireEnv('ARK_MODEL_ID');
    const baseUrl = process.env.ARK_BASE_URL?.trim() || 'https://ark.ap-southeast.bytepluses.com/api/v3';
    const outLang = params.language === 'en' ? 'English' : 'Chinese (简体中文)';

    const userPrompt = [
        `Task title: ${params.taskTitle || '(untitled task)'}`,
        `Task description: ${params.taskDescription?.trim() || '(none)'}`,
        `Output language: ${outLang}`,
        '',
        'Transcript:',
        transcript,
    ].join('\n');

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            temperature: 0.3,
            max_tokens: 2048,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
        }),
    });

    const payload = (await response.json()) as unknown;
    if (!response.ok) {
        throw new Error(`ARK chat/completions failed: ${JSON.stringify(payload)}`);
    }

    const rawText = extractModelText(payload);
    const parsed = parseJsonObjectFromLlmText(rawText) as Record<string, unknown>;
    const summary = String(parsed.summary ?? '').trim();
    if (!summary) throw new Error('Missing summary in model output');

    let keyPoints = normalizeKeyPoints(parsed.key_points);
    if (!keyPoints.length) keyPoints = [{ point: 'Summary', detail: summary.slice(0, 400) }];

    return { summary, key_points: keyPoints };
}
