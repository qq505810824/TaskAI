/**
 * 阿里云 ASR 会议对话交互配置（全局可切换）
 * 通过环境变量 NEXT_PUBLIC_* 在构建时注入，也可在 useVoiceConversation 中传入 aliyunInteraction 覆盖。
 */

export interface AliyunAsrInteractionConfig {
    /**
     * 是否启用「静音稳定窗口」自动提交话轮（仅 asrMode = aliyun 时生效）。
     * 为 true 时：在最后一次字幕变化后经过 silenceStableMs 且无新变化，且达到 minCommitChars，则自动调用提交逻辑。
     */
    silenceAutoCommitEnabled: boolean;
    /**
     * 是否显示「发送」按钮。
     * 可与 silenceAutoCommitEnabled 同时为 true（自动 + 手动兜底）。
     */
    sendButtonEnabled: boolean;
    /**
     * 是否显示「取消」按钮（清空当前字幕并停止本轮输入意图，行为与现有 onStopRecording 分支一致时需与产品对齐）。
     */
    cancelButtonEnabled: boolean;
    /** 静音稳定窗口（毫秒），须 > 1000 以减少与换气停顿冲突，默认 1600 */
    silenceStableMs: number;
    /** 自动提交所需最小字符数，默认 1 */
    minCommitChars: number;
}

const DEFAULT_SILENCE_STABLE_MS = 1600;
const DEFAULT_MIN_COMMIT_CHARS = 1;

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined || value === '') return defaultValue;
    const v = value.toLowerCase().trim();
    if (v === 'true' || v === '1' || v === 'yes') return true;
    if (v === 'false' || v === '0' || v === 'no') return false;
    return defaultValue;
}

function parseIntSafe(value: string | undefined, defaultValue: number): number {
    if (value === undefined || value === '') return defaultValue;
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

/**
 * 读取全局配置（环境变量）。客户端仅 NEXT_PUBLIC_* 生效。
 */
export function getAliyunAsrInteractionConfig(): AliyunAsrInteractionConfig {
    const silenceAutoCommitEnabled = parseBool(
        process.env.NEXT_PUBLIC_ALIYUN_ASR_SILENCE_AUTO_COMMIT,
        true
    );
    const sendButtonEnabled = parseBool(process.env.NEXT_PUBLIC_ALIYUN_ASR_SEND_BUTTON_ENABLED, true);
    const cancelButtonEnabled = parseBool(process.env.NEXT_PUBLIC_ALIYUN_ASR_CANCEL_BUTTON_ENABLED, true);

    let silenceStableMs = parseIntSafe(
        process.env.NEXT_PUBLIC_ALIYUN_ASR_SILENCE_STABLE_MS,
        DEFAULT_SILENCE_STABLE_MS
    );
    if (silenceStableMs < 1000) {
        silenceStableMs = DEFAULT_SILENCE_STABLE_MS;
    }

    const minCommitChars = parseIntSafe(
        process.env.NEXT_PUBLIC_ALIYUN_ASR_MIN_COMMIT_CHARS,
        DEFAULT_MIN_COMMIT_CHARS
    );

    // 若既不开自动提交也不显示发送，则无法提交话轮，强制打开发送按钮
    const effectiveSend =
        !silenceAutoCommitEnabled && !sendButtonEnabled ? true : sendButtonEnabled;

    return {
        silenceAutoCommitEnabled,
        sendButtonEnabled: effectiveSend,
        cancelButtonEnabled,
        silenceStableMs,
        minCommitChars,
    };
}

/**
 * 合并全局配置与局部覆盖（页面 / 测试用）
 */
export function mergeAliyunAsrInteractionConfig(
    override?: Partial<AliyunAsrInteractionConfig>
): AliyunAsrInteractionConfig {
    const base = getAliyunAsrInteractionConfig();
    if (!override) return base;
    const merged: AliyunAsrInteractionConfig = {
        ...base,
        ...override,
    };
    if (
        merged.silenceStableMs < 1000) {
        merged.silenceStableMs = DEFAULT_SILENCE_STABLE_MS;
    }
    if (!merged.silenceAutoCommitEnabled && !merged.sendButtonEnabled) {
        merged.sendButtonEnabled = true;
    }
    return merged;
}
