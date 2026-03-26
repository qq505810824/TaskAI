/**
 * 基于对话文本调用 BytePlus ARK（OpenAI 兼容 chat/completions）生成会议 summary 与 todos。
 * 需配置：ARK_API_KEY、ARK_MODEL_ID；可选 ARK_BASE_URL。
 */

export type ConversationTranscriptRow = {
    user_message_text?: string | null;
    ai_response_text?: string | null;
};

export type LlmSummaryTodoPayload = {
    summary: string;
    key_points: Array<{ point: string; detail: string }>;
    todos: Array<{
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high';
    }>;
};

function requireEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is not configured`);
    }
    return value;
}

function extractModelText(payload: unknown): string {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Model returned an invalid response.');
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

    throw new Error('Model returned an empty reply.');
}

/** 从模型输出中解析 JSON 对象（兼容 ```json 围栏） */
export function parseJsonObjectFromLlmText(raw: string): unknown {
    const trimmed = raw.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/im);
    const candidate = (fenced ? fenced[1] : trimmed).trim();
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
        throw new Error('No JSON object found in model output.');
    }
    const jsonStr = candidate.slice(start, end + 1);
    return JSON.parse(jsonStr) as unknown;
}

function normalizePriority(p: unknown): 'low' | 'medium' | 'high' {
    if (p === 'low' || p === 'medium' || p === 'high') return p;
    return 'medium';
}

function normalizeKeyPoints(raw: unknown): Array<{ point: string; detail: string }> {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => {
            if (item && typeof item === 'object') {
                const o = item as Record<string, unknown>;
                return {
                    point: String(o.point ?? '').trim() || '要点',
                    detail: String(o.detail ?? '').trim(),
                };
            }
            return { point: '要点', detail: '' };
        })
        .filter((kp) => kp.point || kp.detail);
}

function normalizeTodos(
    raw: unknown,
    maxTodos: number
): LlmSummaryTodoPayload['todos'] {
    if (!Array.isArray(raw)) return [];
    const out: LlmSummaryTodoPayload['todos'] = [];
    for (const item of raw) {
        if (out.length >= maxTodos) break;
        if (!item || typeof item !== 'object') continue;
        const o = item as Record<string, unknown>;
        const title = String(o.title ?? '').trim();
        if (!title) continue;
        out.push({
            title,
            description: String(o.description ?? '').trim(),
            priority: normalizePriority(o.priority),
        });
    }
    return out;
}

/**
 * 将会话行格式化为易读 transcript，并限制总长度。
 */
export function buildTranscriptFromConversations(
    rows: ConversationTranscriptRow[],
    options?: { maxChars?: number }
): string {
    const maxChars = options?.maxChars ?? 14000;
    const lines: string[] = [];
    let used = 0;

    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const user = (row.user_message_text ?? '').trim();
        const ai = (row.ai_response_text ?? '').trim();
        const block = [
            `[轮次 ${index + 1}]`,
            user ? `学生: ${user}` : null,
            ai ? `老师/AI: ${ai}` : null,
            '',
        ]
            .filter(Boolean)
            .join('\n');

        if (used + block.length > maxChars) {
            lines.push('…（后续对话已截断以控制长度）');
            break;
        }
        lines.push(block);
        used += block.length;
    }

    return lines.join('\n').trim();
}

function validateAndNormalizePayload(
    parsed: unknown,
    maxTodos: number
): LlmSummaryTodoPayload {
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Parsed JSON is not an object.');
    }
    const o = parsed as Record<string, unknown>;
    const summary = String(o.summary ?? '').trim();
    if (!summary) {
        throw new Error('Missing or empty "summary" in model JSON.');
    }

    let key_points = normalizeKeyPoints(o.key_points);
    if (key_points.length === 0) {
        key_points = [{ point: '概要', detail: summary.slice(0, 400) }];
    }

    let todos = normalizeTodos(o.todos, maxTodos);

    return {
        summary,
        key_points,
        todos,
    };
}

const SYSTEM_PROMPT = [
    'You are an assistant for a meeting / English-learning session review product.',
    'Given a conversation transcript and meeting metadata, write a concise summary and actionable todos.',
    'Rules:',
    '- Output ONLY valid JSON, no markdown fences, no extra commentary before or after the JSON.',
    '- The JSON must match this exact shape:',
    '  {"summary": string, "key_points": [{"point": string, "detail": string}], "todos": [{"title": string, "description": string, "priority": "low"|"medium"|"high"}]}',
    '- key_points: 3 to 6 items when the transcript has enough content; fewer if the transcript is very short.',
    '- todos: at most MAX_TODOS_PLACEHOLDER items; each must be specific and grounded in the transcript.',
    '- Do not invent facts not present in the transcript; if unclear, say so in the summary text only.',
    '- priority must be exactly one of: low, medium, high.',
].join('\n');

/**
 * 调用 ARK chat/completions，返回解析后的 summary / key_points / todos。
 */
export async function generateSummaryAndTodosFromTranscript(params: {
    meetTitle: string;
    meetDescription: string | null;
    transcript: string;
    language?: string;
    maxTodos?: number;
}): Promise<LlmSummaryTodoPayload> {
    const apiKey = requireEnv('ARK_API_KEY');
    const model = requireEnv('ARK_MODEL_ID');
    const baseUrl = process.env.ARK_BASE_URL?.trim() || 'https://ark.ap-southeast.bytepluses.com/api/v3';

    const language = params.language?.trim() || 'en';
    const maxTodos = Math.min(Math.max(params.maxTodos ?? 5, 1), 10);

    if (!params.transcript.trim()) {
        throw new Error('Transcript is empty; nothing to summarize.');
    }

    const system = SYSTEM_PROMPT.replace('MAX_TODOS_PLACEHOLDER', String(maxTodos));

    const userContent = [
        `Meeting title: ${params.meetTitle || '(untitled)'}`,
        `Meeting description: ${params.meetDescription?.trim() || '(none)'}`,
        `Output language for summary, key_points, and todos: ${language === 'en' ? 'English' : 'Chinese (简体中文)'}`,
        '',
        'Transcript:',
        params.transcript,
    ].join('\n');

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            temperature: 0.35,
            max_tokens: 4096,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: userContent },
            ],
        }),
    });

    const payload = (await response.json()) as unknown;

    if (!response.ok) {
        const details =
            payload && typeof payload === 'object' ? JSON.stringify(payload) : response.statusText;
        throw new Error(`ARK chat/completions failed: ${details}`);
    }

    const rawText = extractModelText(payload);
    let parsed: unknown;
    try {
        parsed = parseJsonObjectFromLlmText(rawText);
    } catch (e) {
        throw new Error(
            `Failed to parse model JSON: ${e instanceof Error ? e.message : String(e)}. Raw (truncated): ${rawText.slice(0, 500)}`
        );
    }

    return validateAndNormalizePayload(parsed, maxTodos);
}
