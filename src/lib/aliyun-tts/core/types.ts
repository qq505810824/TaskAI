/**
 * 阿里云 TTS 类型定义
 */

export interface AliyunTTSConfig {
    accessKeyId: string;
    accessKeySecret: string;
    appKey: string;
    region?: string;
    voice?: string;
    format?: 'mp3' | 'wav' | 'pcm';
    sampleRate?: 8000 | 16000 | 48000;
}

export interface TTSOptions {
    voice?: string;
    format?: 'mp3' | 'wav' | 'pcm';
    sampleRate?: 8000 | 16000 | 48000;
    volume?: number; // 0-100
    speechRate?: number; // -500 到 500
    pitchRate?: number; // -500 到 500
}

export interface Voice {
    id: string;
    name: string;
    gender: 'male' | 'female' | 'neutral';
    language: string;
}

export interface TokenData {
    token: string;
    expireTime: number;
    appKey: string;
    region: string;
}

export interface AliyunTTSResponse {
    success: boolean;
    data?: TokenData;
    error?: string;
    message?: string;
}
