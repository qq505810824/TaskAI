/**
 * Token 管理器
 * 负责 Token 的获取、缓存和刷新
 */

import type { TokenData } from '../core/types';

export class TokenManager {
    private cachedToken: TokenData | null = null;
    private tokenFetchPromise: Promise<TokenData> | null = null;

    /**
     * 检查 Token 是否有效
     */
    private isTokenValid(token: TokenData | null): boolean {
        if (!token || !token.token) {
            return false;
        }
        // 提前 5 分钟刷新（留出缓冲时间）
        const bufferTime = 5 * 60 * 1000; // 5 分钟
        const now = Date.now();
        return token.expireTime > now + bufferTime;
    }

    /**
     * 获取新 Token（从 API）
     */
    private async fetchNewToken(): Promise<TokenData> {
        try {
            const response = await fetch('/api/asr/token'); // 复用 ASR Token API
            const data = await response.json();

            if (!data.success || !data.data) {
                throw new Error(data.message || 'Failed to fetch token');
            }

            return {
                token: data.data.token,
                expireTime: data.data.expireTime,
                appKey: data.data.appKey,
                region: data.data.region,
            };
        } catch (error) {
            console.error('Failed to fetch token:', error);
            throw new Error(
                `Failed to fetch Aliyun TTS token: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * 获取有效 Token（自动复用或刷新）
     */
    async getValidToken(): Promise<TokenData> {
        // 检查缓存的 Token 是否有效
        if (this.isTokenValid(this.cachedToken)) {
            console.log('Reusing cached token');
            return this.cachedToken!;
        }

        // 如果正在获取 Token，等待该 Promise
        if (this.tokenFetchPromise) {
            console.log('Waiting for token fetch in progress...');
            return await this.tokenFetchPromise;
        }

        // 获取新 Token
        console.log('Fetching new token');
        this.tokenFetchPromise = this.fetchNewToken();

        try {
            const tokenData = await this.tokenFetchPromise;
            this.cachedToken = tokenData;
            this.tokenFetchPromise = null;
            return tokenData;
        } catch (error) {
            this.tokenFetchPromise = null;
            throw error;
        }
    }

    /**
     * 清除缓存的 Token（强制刷新）
     */
    clearCache(): void {
        this.cachedToken = null;
        this.tokenFetchPromise = null;
    }
}
