export type LlmProvider = 'dify' | 'respond_stream';

export interface LlmProviderConfig {
    provider: LlmProvider;
    fallbackProvider: LlmProvider;
}

function parseLlmProvider(value: string | undefined, defaultValue: LlmProvider): LlmProvider {
    const v = value?.toLowerCase().trim();
    if (v === 'dify') return 'dify';
    if (v === 'respond_stream' || v === 'respond-stream' || v === 'respondstream') return 'respond_stream';
    return defaultValue;
}

/**
 * 全局 LLM Provider 配置：
 * - `NEXT_PUBLIC_LLM_PROVIDER`：当前启用的 LLM 引擎
 * - `LLM_FALLBACK_PROVIDER`：失败回退到的引擎（仅服务端可读取）
 */
export function getLlmProviderConfig(): LlmProviderConfig {
    // 当前 provider 允许在客户端透传观测，因此用 NEXT_PUBLIC_
    const provider = parseLlmProvider(process.env.NEXT_PUBLIC_LLM_PROVIDER, 'respond_stream');
    // fallback 由服务端读取
    const fallbackProvider = parseLlmProvider(process.env.LLM_FALLBACK_PROVIDER, 'respond_stream');
    return { provider, fallbackProvider };
}

