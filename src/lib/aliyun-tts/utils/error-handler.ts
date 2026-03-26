/**
 * 错误处理工具
 */

export class TTSError extends Error {
    constructor(
        message: string,
        public code?: string,
        public statusCode?: number
    ) {
        super(message);
        this.name = 'TTSError';
    }
}

export class ErrorHandler {
    /**
     * 处理 API 错误
     */
    static handleAPIError(error: unknown, context: string = 'TTS API'): never {
        if (error instanceof TTSError) {
            throw error;
        }

        if (error instanceof Error) {
            // 网络错误
            if (error.message.includes('fetch') || error.message.includes('network')) {
                throw new TTSError(`${context}: Network error - ${error.message}`, 'NETWORK_ERROR');
            }

            // 其他错误
            throw new TTSError(`${context}: ${error.message}`, 'UNKNOWN_ERROR');
        }

        throw new TTSError(`${context}: Unknown error occurred`, 'UNKNOWN_ERROR');
    }

    /**
     * 重试机制
     */
    static async retry<T>(
        fn: () => Promise<T>,
        maxRetries: number = 3,
        delay: number = 1000
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                console.warn(`Attempt ${i + 1} failed:`, lastError.message);

                if (i < maxRetries - 1) {
                    // 等待后重试
                    await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
                }
            }
        }

        throw lastError || new Error('Max retries exceeded');
    }
}
