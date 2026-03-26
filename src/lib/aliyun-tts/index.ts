/**
 * 阿里云 TTS 统一导出接口
 * 
 * 注意：由于阿里云 TTS API 需要在服务端调用，前端应使用 API 路由
 * 
 * 前端使用方式：
 * ```typescript
 * import { synthesizeTTS } from '@/lib/aliyun-tts';
 * 
 * // 调用 API 合成语音
 * const audioUrl = await synthesizeTTS('你好，世界！', { voice: 'aiqi' });
 * 
 * // 播放音频
 * const audio = new Audio(audioUrl);
 * audio.play();
 * ```
 * 
 * 服务端使用方式（API 路由中）：
 * ```typescript
 * import { synthesizeSpeech } from '@/lib/aliyun-tts/server';
 * 
 * const audioData = await synthesizeSpeech('你好，世界！');
 * // 返回 ArrayBuffer，可以转换为 Base64 或直接返回
 * ```
 */

import type { ApiResponse } from '@/types/meeting';
import { AliyunTTSRestAPI } from './core/rest-api';
import type { AliyunTTSConfig, TTSOptions } from './core/types';
import { AliyunTTSWebSocketAPI } from './core/websocket-api';
import { AudioPlayer } from './player/audio-player';

export type TTSMode = 'rest' | 'websocket';

export class AliyunTTS {
    private restAPI: AliyunTTSRestAPI;
    private websocketAPI: AliyunTTSWebSocketAPI;
    private player: AudioPlayer;
    private mode: TTSMode;
    private config: AliyunTTSConfig;

    constructor(config: AliyunTTSConfig, mode: TTSMode = 'rest') {
        this.config = config;
        this.mode = mode;
        this.restAPI = new AliyunTTSRestAPI(config);
        this.websocketAPI = new AliyunTTSWebSocketAPI();
        this.player = new AudioPlayer();
    }

    /**
     * 合成并播放（最简单的方式）
     */
    async synthesize(text: string, options?: TTSOptions): Promise<void> {
        const audioUrl = await this.synthesizeOnly(text, options);
        await this.player.play(audioUrl);
    }

    /**
     * 仅合成，不播放（返回音频 URL）
     */
    async synthesizeOnly(text: string, options?: TTSOptions): Promise<string> {
        if (this.mode === 'rest') {
            return await this.restAPI.synthesize(text, options);
        } else {
            // WebSocket 模式（待实现）
            return await this.websocketAPI.synthesizeStream(text, options);
        }
    }

    /**
     * 播放音频 URL
     */
    async play(audioUrl: string): Promise<void> {
        await this.player.play(audioUrl);
    }

    /**
     * 停止播放
     */
    stop(): void {
        this.player.stop();
    }

    /**
     * 暂停播放
     */
    pause(): void {
        this.player.pause();
    }

    /**
     * 恢复播放
     */
    resume(): void {
        this.player.resume();
    }

    /**
     * 切换实现方案（A 或 B）
     */
    setMode(mode: TTSMode): void {
        if (mode === 'websocket') {
            console.warn('WebSocket mode is not implemented yet, falling back to REST API');
            this.mode = 'rest';
        } else {
            this.mode = mode;
        }
    }

    /**
     * 获取当前模式
     */
    getMode(): TTSMode {
        return this.mode;
    }

    /**
     * 配置音色
     */
    setVoice(voice: string): void {
        this.restAPI.updateConfig({ voice });
    }

    /**
     * 更新配置
     */
    updateConfig(config: Partial<AliyunTTSConfig>): void {
        this.config = { ...this.config, ...config };
        this.restAPI.updateConfig(config);
    }

    /**
     * 检查是否正在播放
     */
    isPlaying(): boolean {
        return this.player.isPlaying();
    }

    /**
     * 销毁实例（清理资源）
     */
    destroy(): void {
        this.player.destroy();
        if (this.mode === 'websocket') {
            this.websocketAPI.disconnect();
        }
    }
}

/**
 * 前端调用：通过 API 路由合成语音
 * @param text 要合成的文本
 * @param options TTS 选项
 * @returns 音频 URL（Data URL）
 */
export async function synthesizeTTS(text: string, options?: TTSOptions): Promise<string> {
    try {
        const response = await fetch('/api/tts/synthesize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                ...options,
            }),
        });

        const data: ApiResponse<{
            audioUrl: string;
            format: string;
            size: number;
        }> = await response.json();

        if (!data.success || !data.data) {
            throw new Error(data.message || 'Failed to synthesize speech');
        }

        return data.data.audioUrl;
    } catch (error) {
        throw new Error(
            `Failed to synthesize TTS: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/** 阿里云 SSML 单次请求最大字符数（含标签） */
export const SSML_MAX_LENGTH = 300;

/**
 * 使用 SSML 合成语音（支持停顿、语速等标签）
 * 将 SSML 字符串（需包含 &lt;speak&gt;&lt;/speak&gt;）作为 text 提交给合成接口
 * 注意：阿里云要求 SSML 总长度 &lt; 300 字符。
 *
 * @param ssml 完整 SSML 字符串，例如 buildSSMLWithBreaks() 的返回值
 * @param options TTS 选项（音色、语速等）
 * @returns 音频 URL（Data URL）
 *
 * @example
 * import { buildSSMLWithBreaks, synthesizeTTSFromSSML } from '@/lib/aliyun-tts';
 * const ssml = buildSSMLWithBreaks([
 *   { text: '第一句。', breakMs: 500 },
 *   { text: '第二句。', breakMs: 1000 },
 *   { text: '结束。' }
 * ]);
 * const url = await synthesizeTTSFromSSML(ssml, { voice: 'aiqi' });
 */
export async function synthesizeTTSFromSSML(ssml: string, options?: TTSOptions): Promise<string> {
    const trimmed = ssml.trim();
    if (!trimmed) {
        throw new Error('SSML content cannot be empty');
    }
    if (!trimmed.startsWith('<speak>') || !trimmed.endsWith('</speak>')) {
        throw new Error('SSML must be wrapped in <speak></speak>');
    }
    if (trimmed.length >= SSML_MAX_LENGTH) {
        throw new Error(
            `SSML 总长度不能超过 ${SSML_MAX_LENGTH} 字符（阿里云限制），当前为 ${trimmed.length} 字符，请缩短内容或拆分为多段合成。`
        );
    }
    return synthesizeTTS(trimmed, options);
}

/**
 * 下载音频为 MP3 文件
 * @param audioUrl Data URL 格式的音频 URL
 * @param filename 下载的文件名（可选，默认为 tts-{timestamp}.mp3）
 * @example
 * ```typescript
 * import { synthesizeTTS, downloadAudio } from '@/lib/aliyun-tts';
 * 
 * const audioUrl = await synthesizeTTS('你好，世界！');
 * downloadAudio(audioUrl, 'my-audio.mp3');
 * ```
 */
export { downloadAudio } from './utils/download';

// SSML 工具（带停顿等）
export { buildSSMLWithBreaks, escapeSSMLText } from './utils/ssml';
export type { SSMLSegment } from './utils/ssml';

// 导出类型
export type { AliyunTTSConfig, TTSOptions, Voice } from './core/types';

// 导出工具类（可选，供高级用户使用）
export { AliyunTTSRestAPI } from './core/rest-api';
export { AliyunTTSWebSocketAPI } from './core/websocket-api';
export { AudioPlayer } from './player/audio-player';

// AliyunTTS 类已在上面定义并导出（保留向后兼容，但建议使用 synthesizeTTS 函数）
