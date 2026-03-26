import CryptoJS from 'crypto-js';
import { NextRequest, NextResponse } from 'next/server';

// 从环境变量获取配置
const ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID || '';
const ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET || '';
const APP_KEY = process.env.ALIYUN_ASR_APP_KEY || '';
const REGION = process.env.ALIYUN_REGION || 'cn-shanghai';

// 阿里云签名工具函数
function percentEncode(str: string): string {
    return encodeURIComponent(str)
        .replace(/\+/g, '%20')
        .replace(/\*/g, '%2A')
        .replace(/%7E/g, '~');
}

// 生成阿里云 NLS Token（使用标准签名算法）
async function generateNLSToken() {
    const timestamp = new Date().toISOString();
    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // 构建参数字典（按字母顺序排序）
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

    // 对参数进行排序并构建查询字符串
    const sortedKeys = Object.keys(params).sort();
    const queryString = sortedKeys
        .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
        .join('&');

    // 构建签名字符串
    const stringToSign = `GET&${percentEncode('/')}&${percentEncode(queryString)}`;

    // 计算签名
    const signature = CryptoJS.HmacSHA1(stringToSign, ACCESS_KEY_SECRET + '&').toString(CryptoJS.enc.Base64);

    // 构建完整 URL
    const url = `https://nls-meta.${REGION}.aliyuncs.com/?${queryString}&Signature=${percentEncode(signature)}`;

    console.log('Requesting token from:', url.replace(/AccessKeyId=[^&]+/, 'AccessKeyId=***').replace(/Signature=[^&]+/, 'Signature=***'));

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        // 检查响应状态
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Aliyun API error response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText,
            });
            throw new Error(`Aliyun API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        // console.log('Aliyun API response:', JSON.stringify(data, null, 2));

        // 检查是否有错误信息
        // if (data.Code && data.Code !== 'Success') {
        //     console.error('Aliyun API returned error:', data);
        //     throw new Error(`Aliyun API error: ${data.Code} - ${data.Message || data.message || 'Unknown error'}`);
        // }

        // 检查 Token 字段（可能有不同的响应格式）
        if (data.Token && data.Token.Id) {
            return {
                token: data.Token.Id,
                expireTime: data.Token.ExpireTime,
            };
        }

        // 尝试其他可能的响应格式
        if (data.Id) {
            return {
                token: data.Id,
                expireTime: data.ExpireTime || Date.now() + 24 * 60 * 60 * 1000, // 默认24小时
            };
        }

        // 如果没有 Token，记录完整响应以便调试
        console.error('Unexpected response format:', JSON.stringify(data, null, 2));
        throw new Error(`Failed to generate token: Unexpected response format. Response: ${JSON.stringify(data)}`);
    } catch (error) {
        console.error('Error generating NLS token:', error);
        // 如果是已知错误，直接抛出
        if (error instanceof Error) {
            throw error;
        }
        // 否则包装为 Error
        throw new Error(`Failed to generate token: ${error}`);
    }
}

// GET /api/asr/token - 获取阿里云 ASR Token
export async function GET(request: NextRequest) {
    try {
        // 验证环境变量
        if (!ACCESS_KEY_ID || !ACCESS_KEY_SECRET || !APP_KEY) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Configuration error',
                    message: 'Aliyun ASR credentials not configured. Please set ALIYUN_ACCESS_KEY_ID, ALIYUN_ACCESS_KEY_SECRET, and ALIYUN_ASR_APP_KEY in .env.local',
                },
                { status: 500 }
            );
        }

        const tokenData = await generateNLSToken();

        return NextResponse.json({
            success: true,
            data: {
                token: tokenData.token,
                expireTime: tokenData.expireTime,
                appKey: APP_KEY,
                region: REGION,
            },
        });
    } catch (error) {
        console.error('Error in GET /api/asr/token:', error);

        // 提供更详细的错误信息
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isConfigError = errorMessage.includes('not configured') || errorMessage.includes('Configuration error');

        return NextResponse.json(
            {
                success: false,
                error: isConfigError ? 'Configuration error' : 'Internal server error',
                message: errorMessage,
                // 开发环境下提供更多调试信息
                ...(process.env.NODE_ENV === 'development' && {
                    debug: {
                        hasAccessKeyId: !!ACCESS_KEY_ID,
                        hasAccessKeySecret: !!ACCESS_KEY_SECRET,
                        hasAppKey: !!APP_KEY,
                        region: REGION,
                        accessKeyIdLength: ACCESS_KEY_ID.length,
                        accessKeySecretLength: ACCESS_KEY_SECRET.length,
                        appKeyLength: APP_KEY.length,
                    },
                }),
            },
            { status: 500 }
        );
    }
}
