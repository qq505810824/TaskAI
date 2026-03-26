/**
 * 音频播放器
 * 独立封装，不依赖具体 TTS 实现
 */

export class AudioPlayer {
    private audio: HTMLAudioElement | null = null;
    private currentUrl: string | null = null;

    /**
     * 播放音频（自动处理 Blob URL）
     */
    async play(audioUrl: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // 如果正在播放，先停止
            this.stop();

            // 创建新的 Audio 对象
            const audio = new Audio(audioUrl);
            this.audio = audio;
            this.currentUrl = audioUrl;

            // 播放完成
            audio.onended = () => {
                this.cleanup();
                resolve();
            };

            // 播放错误
            audio.onerror = (err) => {
                this.cleanup();
                reject(new Error(`Audio playback error: ${err}`));
            };

            // 开始播放
            audio.play().catch((error) => {
                this.cleanup();
                reject(new Error(`Failed to play audio: ${error.message}`));
            });
        });
    }

    /**
     * 停止播放
     */
    stop(): void {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.cleanup();
        }
    }

    /**
     * 暂停播放
     */
    pause(): void {
        if (this.audio) {
            this.audio.pause();
        }
    }

    /**
     * 恢复播放
     */
    resume(): void {
        if (this.audio) {
            this.audio.play().catch((error) => {
                console.error('Failed to resume audio:', error);
            });
        }
    }

    /**
     * 检查是否正在播放
     */
    isPlaying(): boolean {
        return this.audio !== null && !this.audio.paused && !this.audio.ended;
    }

    /**
     * 清理资源
     */
    private cleanup(): void {
        if (this.audio) {
            // 释放 Blob URL
            if (this.currentUrl && this.currentUrl.startsWith('blob:')) {
                URL.revokeObjectURL(this.currentUrl);
            }
            this.audio = null;
            this.currentUrl = null;
        }
    }

    /**
     * 销毁播放器（清理所有资源）
     */
    destroy(): void {
        this.stop();
    }
}
