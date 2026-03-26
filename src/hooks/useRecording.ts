import { convertToMp3 } from '@/components/base/voice-input/utils';
import type { ApiResponse } from '@/types/meeting';
import Recorder from 'js-audio-recorder';
import { useCallback, useRef, useState } from 'react';

export const useRecording = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

    // 使用 js-audio-recorder（参考 index.tsx）
    const recorderRef = useRef<Recorder | null>(null);

    const startRecording = useCallback(async () => {
        try {
            // 初始化 recorder（参考 index.tsx 的配置）
            if (!recorderRef.current) {
                recorderRef.current = new Recorder({
                    sampleBits: 16,
                    sampleRate: 16000,
                    numChannels: 1,
                    compiling: false,
                });
            }

            await recorderRef.current.start();
            setIsRecording(true);
            setAudioChunks([]);
            setError(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
            setError(errorMessage);
            setIsRecording(false);
            throw err;
        }
    }, []);

    const stopRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (!recorderRef.current || !isRecording) {
                resolve(null);
                return;
            }

            try {
                // 停止录音（参考 index.tsx:55）
                recorderRef.current.stop();

                // 使用 convertToMp3 转换为 MP3（参考 index.tsx:60）
                // convertToMp3 需要 recorder 对象，它会调用 recorder.getWAV() 和 recorder.getChannelData()
                const mp3Blob = convertToMp3(recorderRef.current);

                // 更新状态
                setAudioChunks([mp3Blob]);
                setIsRecording(false);
                setError(null);

                // 返回 MP3 blob
                resolve(mp3Blob);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording';
                console.error('Error stopping recording:', err);
                setError(errorMessage);
                setIsRecording(false);
                resolve(null);
            }
        });
    }, [isRecording]);

    const transcribeAudio = useCallback(async (file: File, meetId: string, userId: string) => {
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('meetId', meetId);
            formData.append('userId', userId);

            const response = await fetch('/api/recordings/transcribe', {
                method: 'POST',
                body: formData,
            });

            const data: ApiResponse<{
                recordingId: string;
                transcriptionId: string;
                text: string;
                language: string;
                duration: number;
            }> = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to transcribe audio');
            }

            return data.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getAudioBlob = useCallback(() => {
        if (audioChunks.length > 0) {
            // 返回 MP3 blob（因为 stopRecording 已经转换为 MP3）
            return audioChunks[0];
        }
        return null;
    }, [audioChunks]);

    return {
        loading,
        error,
        isRecording,
        startRecording,
        stopRecording,
        transcribeAudio,
        getAudioBlob,
    };
};
