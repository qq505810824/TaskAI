/**
 * 阿里云 TTS SSML 工具
 * 用于构建带停顿等效果的 SSML 文本，供语音合成使用
 * @see https://help.aliyun.com/zh/isi/developer-reference/ssml-overview
 */

/** 单个片段：文本 + 其后可选停顿时长（毫秒） */
export interface SSMLSegment {
    /** 要朗读的文本 */
    text: string;
    /** 该片段后的停顿时长（毫秒），0 表示不插入停顿。阿里云支持 50–10000ms */
    breakMs?: number;
}

/**
 * 对 SSML 内的文本进行 XML 转义，避免破坏标签
 */
export function escapeSSMLText(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * 将停顿时长格式化为阿里云 SSML 要求的字符串
 * 阿里云：time 为 "number ms"（50–10000）或 "number s"（1–10）
 */
function formatBreakTime(breakMs: number): string {
    if (breakMs >= 1000) {
        const seconds = Math.min(10, Math.floor(breakMs / 1000));
        return `${seconds}s`;
    }
    const ms = Math.max(50, Math.min(10000, breakMs));
    return `${ms}ms`;
}

/**
 * 根据片段列表构建带停顿的 SSML 字符串
 * 格式：<speak>文本1<break time="500ms"/>文本2<break time="1s"/>...</speak>
 *
 * @param segments 片段列表，每项可指定其后停顿（breakMs）
 * @returns 完整 SSML 字符串，可直接作为合成接口的 text 传入
 *
 * @example
 * buildSSMLWithBreaks([
 *   { text: '第一句。', breakMs: 500 },
 *   { text: '第二句。', breakMs: 1000 },
 *   { text: '结束。' }
 * ]);
 * // => "<speak>第一句。<break time=\"500ms\"/>第二句。<break time=\"1s\"/>结束。</speak>"
 */
export function buildSSMLWithBreaks(segments: SSMLSegment[]): string {
    if (!segments.length) {
        return '<speak></speak>';
    }

    const parts: string[] = [];

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const escaped = escapeSSMLText(seg.text.trim());
        if (escaped) {
            parts.push(escaped);
        }
        // 最后一个片段后不插入 break；其余片段若 breakMs 有效则插入
        const breakMs = seg.breakMs ?? 0;
        if (i < segments.length - 1 && breakMs > 0) {
            parts.push(`<break time="${formatBreakTime(breakMs)}"/>`);
        }
    }

    return `<speak>${parts.join('')}</speak>`;
}
