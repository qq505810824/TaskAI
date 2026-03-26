/**
 * 阿里云 TTS RESTful API 实现（方案 A）
 */

import { ErrorHandler, TTSError } from '../utils/error-handler';
import { TokenManager } from '../utils/token-manager';
import { AliyunTTSConfigManager } from './config';
import type { AliyunTTSConfig, TTSOptions } from './types';

export class AliyunTTSRestAPI {
    private configManager: AliyunTTSConfigManager;
    private tokenManager: TokenManager;

    constructor(config: AliyunTTSConfig) {
        this.configManager = new AliyunTTSConfigManager(config);
        this.tokenManager = new TokenManager();
    }

    /**
     * 合成语音（返回音频 Blob URL）
     */
    async synthesize(text: string, options?: TTSOptions): Promise<string> {
        if (!text || text.trim().length === 0) {
            throw new TTSError('Text cannot be empty', 'INVALID_INPUT');
        }

        try {
            // 获取有效 Token
            const tokenData = await this.tokenManager.getValidToken();

            // 调用 TTS API
            const audioBlob = await ErrorHandler.retry(
                () => this.callTTSAPI(text, tokenData, options),
                3,
                1000
            );

            // 转换为 Blob URL
            const url = URL.createObjectURL(audioBlob);
            return url;
        } catch (error) {
            ErrorHandler.handleAPIError(error, 'Aliyun TTS REST API');
        }
    }

    /**
     * 调用阿里云 TTS API
     */
    private async callTTSAPI(
        text: string,
        tokenData: { token: string; appKey: string; region: string },
        options?: TTSOptions
    ): Promise<Blob> {
        const config = this.configManager.getConfig();
        // 优先使用 Token 响应中的 region，否则使用配置中的
        const region = tokenData.region || config.region;
        const apiUrl = `https://nls-gateway.${region}.aliyuncs.com/stream/v1/tts`;

        const requestBody = {
            appkey: tokenData.appKey,
            token: tokenData.token,
            text: text,
            voice: options?.voice || config.voice,
            format: options?.format || config.format,
            sample_rate: options?.sampleRate || config.sampleRate,
            volume: options?.volume ?? 50,
            speech_rate: options?.speechRate ?? 0,
            pitch_rate: options?.pitchRate ?? 0,
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch {
                // 如果不是 JSON，使用原始文本
                if (errorText) {
                    errorMessage = errorText;
                }
            }

            // Token 过期，清除缓存并重试一次
            if (response.status === 401 || response.status === 403) {
                this.tokenManager.clearCache();
                throw new TTSError(`Token expired or invalid: ${errorMessage}`, 'TOKEN_EXPIRED', response.status);
            }

            throw new TTSError(`TTS API error: ${errorMessage}`, 'API_ERROR', response.status);
        }

        // 检查响应类型
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('audio')) {
            const errorText = await response.text();
            throw new TTSError(`Unexpected response type: ${contentType}. Response: ${errorText}`, 'INVALID_RESPONSE');
        }

        // 返回音频 Blob
        const audioData = await response.arrayBuffer();
        const mimeType = this.getMimeType(options?.format || config.format);
        return new Blob([audioData], { type: mimeType });
    }

    /**
     * 获取 MIME 类型
     */
    private getMimeType(format: 'mp3' | 'wav' | 'pcm'): string {
        switch (format) {
            case 'mp3':
                return 'audio/mpeg';
            case 'wav':
                return 'audio/wav';
            case 'pcm':
                return 'audio/pcm';
            default:
                return 'audio/mpeg';
        }
    }

    /**
     * 更新配置
     */
    updateConfig(config: Partial<AliyunTTSConfig>): void {
        this.configManager.updateConfig(config);
    }
}
