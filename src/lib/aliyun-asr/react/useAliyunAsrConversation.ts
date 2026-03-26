import { useAliyunASR } from '@/hooks/useAliyunASR';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
    AsrError,
    AsrStatus,
    AudioPlayer,
    ConversationSessionState,
    LlmHandler,
    TtsConfig,
    TtsHandler,
    UtteranceRecord,
} from '../types';

export interface UseAliyunAsrConversationOptions {
    llm: {
        handler: LlmHandler;
        meta?: {
            userId?: string;
            title?: string;
            topic?: string;
            hints?: string;
        };
    };
    tts: {
        handler: TtsHandler;
        player?: AudioPlayer;
        config?: TtsConfig;
    };
    autoStart?: boolean;
}

export interface UseAliyunAsrConversationResult {
    status: AsrStatus;
    error: AsrError | null;
    transcriptLive: string;
    session: ConversationSessionState;
    isConnected: boolean;
    isRecording: boolean;
    startConversation: () => Promise<void>;
    stopConversation: () => Promise<void>;
    cancelCurrentUtterance: () => Promise<void>;
    sendCurrentUtterance: () => Promise<void>;
}

export function useAliyunAsrConversation(
    options: UseAliyunAsrConversationOptions
): UseAliyunAsrConversationResult {
    const { llm, tts, autoStart = false } = options;

    const [status, setStatus] = useState<AsrStatus>('idle');
    const [error, setError] = useState<AsrError | null>(null);
    const [session, setSession] = useState<ConversationSessionState>({
        id: `session-${Date.now()}`,
        utterances: [],
    });
    const recordingStartTimeRef = useRef<number | null>(null);

    const {
        isConnected,
        isRecording,
        transcript,
        error: asrError,
        connect,
        startRecording,
        stopRecording,
        disconnect,
        clearTranscript,
    } = useAliyunASR({
        language: 'zh',
        sampleRate: 16000,
        format: 'pcm',
        onError: (err) => {
            const e: AsrError = { message: err.message, raw: err };
            setError(e);
            setStatus('error');
        },
    });

    // 同步 ASR 错误到本地 error
    useEffect(() => {
        if (asrError) {
            setError({ message: asrError });
            setStatus('error');
        }
    }, [asrError]);

    const playAudioInternal: AudioPlayer = useCallback(
        async (audioUrl: string) => {
            if (tts.player) {
                await tts.player(audioUrl);
            } else {
                const audio = new Audio(audioUrl);
                await audio.play();
            }
        },
        [tts]
    );

    const startConversation = useCallback(async () => {
        try {
            setError(null);
            // 每次开始对话时，清空历史对话记录，重新开始一轮新的会话
            setSession({
                id: `session-${Date.now()}`,
                utterances: [],
            });
            setStatus(isConnected ? 'listening' : 'connecting');
            if (!isConnected) {
                await connect();
            }
            await startRecording();
            recordingStartTimeRef.current = Date.now();
            setStatus('recording');
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to start conversation');
            setError({ message: e.message, raw: err });
            setStatus('error');
        }
    }, [connect, isConnected, startRecording]);

    const stopConversation = useCallback(async () => {
        try {
            await stopRecording();
            await disconnect();
            setStatus('idle');
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to stop conversation');
            setError({ message: e.message, raw: err });
            setStatus('error');
        }
    }, [disconnect, stopRecording]);

    const cancelCurrentUtterance = useCallback(async () => {
        clearTranscript();
        recordingStartTimeRef.current = Date.now();
        if (isConnected) {
            setStatus('recording');
        } else {
            setStatus('idle');
        }
    }, [clearTranscript, isConnected]);

    const sendCurrentUtterance = useCallback(async () => {
        const userText = transcript.trim();
        if (!userText) return;

        try {
            setStatus('processing');
            const recordingBlob = await stopRecording();

            const now = new Date();
            const userSentAt = now.toISOString();
            const audioDuration =
                recordingStartTimeRef.current != null
                    ? Math.max(0, Math.ceil((Date.now() - recordingStartTimeRef.current) / 1000))
                    : 0;

            recordingStartTimeRef.current = null;

            const llmRes = await llm.handler({
                userText,
                meta: llm.meta,
            });

            const aiText = llmRes.aiText || '';
            const aiRespondedAt = new Date().toISOString();

            let user_audio_url: string | undefined;
            if (recordingBlob && recordingBlob.size > 0) {
                try {
                    user_audio_url = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = () => reject(reader.error);
                        reader.readAsDataURL(recordingBlob);
                    });
                } catch (_) {
                    // 忽略转换失败，该条记录无录音回放
                }
            }

            const utterance: UtteranceRecord = {
                id: `utt-${Date.now()}`,
                userText,
                aiText,
                userAudioDuration: audioDuration,
                userSentAt,
                aiRespondedAt,
                user_audio_url,
            };

            setSession((prev) => ({
                ...prev,
                utterances: [...prev.utterances, utterance],
            }));

            clearTranscript();

            if (aiText) {
                setStatus('speaking');
                const audioUrl = await tts.handler(aiText, tts.config);
                await playAudioInternal(audioUrl);
            }

            // 播放完成后，如果连接仍在，可以继续下一轮
            if (isConnected) {
                setStatus('listening');
                await startRecording();
                recordingStartTimeRef.current = Date.now();
                setStatus('recording');
            } else {
                setStatus('idle');
            }
        } catch (err) {
            const e = err instanceof Error ? err : new Error('Failed to send utterance');
            console.error('sendCurrentUtterance error:', e);
            setError({ message: e.message, raw: err });
            setStatus('error');
        }
    }, [clearTranscript, isConnected, llm, playAudioInternal, startRecording, stopRecording, transcript, tts]);

    // 自动开始会话（可选）
    useEffect(() => {
        if (!autoStart) return;
        void startConversation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStart]);

    return {
        status,
        error,
        transcriptLive: transcript,
        session,
        isConnected,
        isRecording,
        startConversation,
        stopConversation,
        cancelCurrentUtterance,
        sendCurrentUtterance,
    };
}

