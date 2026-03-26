/**
 * 阿里云 TTS 服务端工具
 * 用于在 API 路由中直接调用阿里云 TTS API
 */

import CryptoJS from 'crypto-js';
import type { TTSOptions } from './core/types';

// 从环境变量获取配置
const ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID || '';
const ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET || '';
const APP_KEY = process.env.ALIYUN_TTS_APP_KEY || process.env.ALIYUN_ASR_APP_KEY || '';
const REGION = process.env.ALIYUN_REGION || 'cn-shanghai';

interface TokenData {
    token: string;
    expireTime: number;
}

// 阿里云签名工具函数
function percentEncode(str: string): string {
    return encodeURIComponent(str)
        .replace(/\+/g, '%20')
        .replace(/\*/g, '%2A')
        .replace(/%7E/g, '~');
}

// 生成阿里云 NLS Token
async function generateNLSToken(): Promise<TokenData> {
    const timestamp = new Date().toISOString();
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const params: Record<string, string> = {
        AccessKeyId: ACCESS_KEY_ID,
        Action: 'CreateToken',
        Format: 'JSON',
        RegionId: REGION,
        SignatureMethod: 'HMAC-SHA1',
        SignatureNonce: nonce,
        SignatureVersion: '1.0',
        Timestamp: timestamp,
        Version: '2019-02-28',
    };

    const sortedKeys = Object.keys(params).sort();
    const queryString = sortedKeys
        .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
        .join('&');

    const stringToSign = `GET&${percentEncode('/')}&${percentEncode(queryString)}`;
    const signature = CryptoJS.HmacSHA1(stringToSign, ACCESS_KEY_SECRET + '&').toString(CryptoJS.enc.Base64);

    const url = `https://nls-meta.${REGION}.aliyuncs.com/?${queryString}&Signature=${percentEncode(signature)}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Aliyun API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();

        if (data.Token && data.Token.Id) {
            return {
                token: data.Token.Id,
                expireTime: data.Token.ExpireTime,
            };
        }

        if (data.Id) {
            return {
                token: data.Id,
                expireTime: data.ExpireTime || Date.now() + 24 * 60 * 60 * 1000,
            };
        }

        throw new Error(`Failed to generate token: Unexpected response format. Response: ${JSON.stringify(data)}`);
    } catch (error) {
        console.error('Error generating NLS token:', error);
        throw error instanceof Error ? error : new Error(`Failed to generate token: ${error}`);
    }
}

// Token 缓存（服务端单例）
let cachedToken: TokenData | null = null;
let tokenFetchPromise: Promise<TokenData> | null = null;

/**
 * 获取有效 Token（自动复用或刷新）
 */
async function getValidToken(): Promise<TokenData> {
    // 检查缓存的 Token 是否有效（提前 5 分钟刷新）
    if (cachedToken) {
        const bufferTime = 5 * 60 * 1000; // 5 分钟
        const now = Date.now();
        if (cachedToken.expireTime > now + bufferTime) {
            return cachedToken;
        }
    }

    // 如果正在获取 Token，等待该 Promise
    if (tokenFetchPromise) {
        return await tokenFetchPromise;
    }

    // 获取新 Token
    tokenFetchPromise = generateNLSToken();
    try {
        const tokenData = await tokenFetchPromise;
        cachedToken = tokenData;
        tokenFetchPromise = null;
        return tokenData;
    } catch (error) {
        tokenFetchPromise = null;
        throw error;
    }
}

/**
 * 调用阿里云 TTS API 合成语音
 * @param text 要合成的文本
 * @param options TTS 选项
 * @returns 音频二进制数据
 */
export async function synthesizeSpeech(
    text: string,
    options: TTSOptions & { voice?: string; format?: 'mp3' | 'wav' | 'pcm'; sampleRate?: 8000 | 16000 | 48000 } = {}
): Promise<ArrayBuffer> {
    if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
    }

    // 验证环境变量
    if (!ACCESS_KEY_ID || !ACCESS_KEY_SECRET || !APP_KEY) {
        throw new Error(
            'Aliyun TTS credentials not configured. Please set ALIYUN_ACCESS_KEY_ID, ALIYUN_ACCESS_KEY_SECRET, and ALIYUN_TTS_APP_KEY (or ALIYUN_ASR_APP_KEY) in environment variables'
        );
    }

    // 获取有效 Token
    const tokenData = await getValidToken();

    // 构建请求参数
    const voice = options.voice || 'aiqi';
    const format = options.format || 'mp3';
    const sampleRate = options.sampleRate || 16000;
    const volume = options.volume ?? 50;
    const speechRate = options.speechRate ?? 0;
    const pitchRate = options.pitchRate ?? 0;

    const apiUrl = `https://nls-gateway.${REGION}.aliyuncs.com/stream/v1/tts`;

    const requestBody = {
        appkey: APP_KEY,
        token: tokenData.token,
        text: text,
        voice: voice,
        format: format,
        sample_rate: sampleRate,
        volume: volume,
        speech_rate: speechRate,
        pitch_rate: pitchRate,
    };

    // 调用 TTS API（最多重试 3 次）
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
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
                    if (errorText) {
                        errorMessage = errorText;
                    }
                }

                // Token 过期或无效，清除缓存并重试
                if (response.status === 401 || response.status === 403) {
                    cachedToken = null;
                    if (attempt < 2) {
                        // 重新获取 Token 并重试
                        await getValidToken();
                        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
                        continue;
                    }
                }

                // 错误 418：可能是音色不支持或其他参数问题，清除 Token 缓存并重试
                if (response.status === 418 || errorMessage.includes('418') || errorMessage.includes('TtsClientError')) {
                    console.warn('TTS API error 418 detected, clearing token cache and retrying...');
                    cachedToken = null;
                    if (attempt < 2) {
                        // 重新获取 Token 并重试
                        await getValidToken();
                        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
                        continue;
                    }
                }

                throw new Error(`TTS API error: ${errorMessage}`);
            }

            // 检查响应类型
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('audio')) {
                const errorText = await response.text();
                throw new Error(`Unexpected response type: ${contentType}. Response: ${errorText}`);
            }

            // 返回音频数据
            return await response.arrayBuffer();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');
            if (attempt < 2) {
                // 等待后重试
                await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }

    throw lastError || new Error('Failed to synthesize speech after 3 attempts');
}
