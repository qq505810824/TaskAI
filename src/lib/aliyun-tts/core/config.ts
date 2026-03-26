/**
 * 阿里云 TTS 配置管理
 */

import type { AliyunTTSConfig } from './types';

export class AliyunTTSConfigManager {
    private config: Required<AliyunTTSConfig>;

    constructor(config: AliyunTTSConfig) {
        // 注意：在客户端环境下，accessKeyId 和 accessKeySecret 不需要
        // 因为 Token 是通过服务端 API 路由获取的
        // 但为了类型兼容，我们仍然接受这些参数（可以为空）
        
        // 验证 appKey（虽然也会从 Token API 响应中获取，但这里作为默认值）
        // 在客户端环境下，appKey 也可以为空，因为会从 Token API 响应中获取

        this.config = {
            accessKeyId: config.accessKeyId || '', // 客户端环境下可以为空
            accessKeySecret: config.accessKeySecret || '', // 客户端环境下可以为空
            appKey: config.appKey || '', // 客户端环境下可以为空，会从 Token API 响应中获取
            region: config.region || 'cn-shanghai',
            voice: config.voice || 'aiqi',
            format: config.format || 'mp3',
            sampleRate: config.sampleRate || 16000,
        };
    }

    getConfig(): Required<AliyunTTSConfig> {
        return { ...this.config };
    }

    updateConfig(updates: Partial<AliyunTTSConfig>): void {
        this.config = { ...this.config, ...updates };
    }

    getAccessKeyId(): string {
        return this.config.accessKeyId;
    }

    getAccessKeySecret(): string {
        return this.config.accessKeySecret;
    }

    getAppKey(): string {
        return this.config.appKey;
    }

    getRegion(): string {
        return this.config.region;
    }

    getVoice(): string {
        return this.config.voice;
    }

    getFormat(): 'mp3' | 'wav' | 'pcm' {
        return this.config.format;
    }

    getSampleRate(): 8000 | 16000 | 48000 {
        return this.config.sampleRate;
    }
}
