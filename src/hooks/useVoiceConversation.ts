import {
    mergeAliyunAsrInteractionConfig,
    type AliyunAsrInteractionConfig,
} from '@/config/aliyun-asr-interaction';
import { synthesizeTTS } from '@/lib/aliyun-tts';
import { transcribeAudioWithDify } from '@/lib/difyTranscription';
import type { ApiResponse, Conversation, Meet } from '@/types/meeting';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAliyunASR } from './useAliyunASR';
import { useConversations } from './useConversations';
import { useRecording } from './useRecording';
import { useTTS } from './useTTS';

// ASR 方案类型
export type ASRMode = 'dify' | 'aliyun';

interface UseVoiceConversationOptions {
    asrMode?: ASRMode; // ASR 方案选择，默认 'aliyun'
    /** 覆盖全局阿里云 ASR 交互配置（静音开关、发送/取消按钮等） */
    aliyunInteraction?: Partial<AliyunAsrInteractionConfig>;
}

export const useVoiceConversation = (
    meet: Meet,
    userId: string,
    options: UseVoiceConversationOptions = {}
) => {
    const { asrMode = 'aliyun', aliyunInteraction: aliyunInteractionOverride } = options;

    const aliyunInteraction = mergeAliyunAsrInteractionConfig(aliyunInteractionOverride);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [userMeetId, setUserMeetId] = useState<string | null>(null);
    const [userMeetStatus, setUserMeetStatus] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing' | 'processing' | 'speaking' | 'listening'>('idle');
    // Dify conversation_id - 用于维护对话上下文，从第一次对话开始到会议结束
    const [difyConversationId, setDifyConversationId] = useState<string>('');
    // 实时转写字幕（仅用于阿里云 ASR 方案）
    const [transcriptLive, setTranscriptLive] = useState<string>('');
    // 是否在监听状态（仅用于阿里云 ASR 方案）
    const [isListening, setIsListening] = useState(false);

    // Dify 方案使用的录音 hook
    const { startRecording, stopRecording, getAudioBlob, isRecording } = useRecording();

    const { sendMessage } = useConversations();
    const { playAudio, text_to_audio, speakTtsStream } = useTTS();

    // 用于跟踪是否正在处理中，避免重复触发
    const isProcessingRef = useRef(false);
    // 用于跟踪当前录音时长（阿里云 ASR 方案）
    const recordingStartTimeRef = useRef<number | null>(null);
    // 用于存储 asrStartRecording 函数，避免循环依赖
    const asrStartRecordingRef = useRef<(() => Promise<void>) | null>(null);
    // 进入对话前，确保为 (meet, user) 获取/创建 user_meet 实例
    const joinedUserMeetRef = useRef(false);
    useEffect(() => {
        let cancelled = false;

        const joinUserMeet = async () => {
            try {
                if (!meet?.id || !userId) return;
                if (joinedUserMeetRef.current) return;
                joinedUserMeetRef.current = true;


                const response = await fetch('/api/user-meets/join', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        meetId: meet.id,
                        userId,
                    }),
                });

                const data: ApiResponse<{
                    id: string;
                    status: string;
                }> = await response.json();

                // console.log('joinUserMeet data:', data);

                if (data.success && data.data) {
                    setUserMeetId(data.data.id);
                    setUserMeetStatus(data.data.status);
                }
            } catch (error) {
                console.error('Failed to join user_meets:', error);
            }
        };

        void joinUserMeet();

        return () => {
            cancelled = true;
        };
    }, [meet.id, userId]);


    // 处理最终转写结果（阿里云 ASR 方案）
    const handleFinalTranscription = useCallback(
        async (transcriptionText: string) => {
            if (isProcessingRef.current) {
                return; // 防止重复处理
            }

            try {
                isProcessingRef.current = true;
                setIsListening(false);
                setStatus('processing');

                // 计算录音时长
                const audioDuration = recordingStartTimeRef.current
                    ? Math.ceil((Date.now() - recordingStartTimeRef.current) / 1000)
                    : 0;
                recordingStartTimeRef.current = null;

                // 没有 userMeetId 时无法安全归属数据，直接中止本轮（理论上进入页面时就应已 join）
                if (!userMeetId) {
                    console.warn('No userMeetId, skip processing transcription');
                    setStatus('idle');
                    setIsListening(false);
                    return;
                }

                // 调用 LLM 获取回复
                const response = await sendMessage({
                    meetId: meet.id,
                    userId,
                    userMeetId,
                    audioUrl: ``,
                    title: meet.title || '',
                    topic: meet.description || '',
                    hints: meet.description || '',
                    transcriptionText,
                    conversation_id: difyConversationId,
                    audioDuration,
                });

                // 更新 conversation_id
                if (response?.conversation_id && response.conversation_id !== difyConversationId) {
                    setDifyConversationId(response.conversation_id);
                }

                // 创建对话记录
                const newConversation: Conversation = {
                    id: response?.conversationId || `conv-${Date.now()}`,
                    meet_id: meet.id,
                    user_id: userId,
                    user_meet_id: userMeetId,
                    user_audio_url: ``,
                    user_message_text: transcriptionText,
                    user_audio_duration: audioDuration,
                    ai_response_text: response?.aiResponseText || '',
                    user_sent_at: response?.userSentAt || new Date().toISOString(),
                    ai_responded_at: response?.aiRespondedAt || new Date().toISOString(),
                    created_at: new Date().toISOString(),
                };

                setConversations((prev) => [...prev, newConversation]);

                // 播放 AI 回复
                setStatus('speaking');



                const ttsProvider = process.env.NEXT_PUBLIC_TTS_PROVIDER?.toLowerCase().trim();
                const useTtsStream = ttsProvider === 'tts_stream' || ttsProvider === 'tts-stream';

                if (useTtsStream) {
                    // 真正流式播放：tts-stream 会直接把音频 append 到 MediaSource
                    await speakTtsStream(response?.aiResponseText ?? '');
                } else {
                    if (asrMode === 'aliyun') {
                        const url = await synthesizeTTS(response?.aiResponseText ?? '', { voice: 'lydia' });
                        await playAudio(url);
                    } else {
                        try {
                            const audioUrl = await text_to_audio(response?.aiResponseText ?? '');
                            await playAudio(audioUrl);
                        } catch (error) {
                            console.error('Failed to play audio:', error);
                        }
                    }
                }


                // 播放完成后，如果会议未结束，恢复监听
                if (meet.status !== 'ended') {
                    setStatus('listening');
                    setIsListening(true);
                    // 重新开始录音（通过 ref 访问）
                    if (asrStartRecordingRef.current) {
                        await asrStartRecordingRef.current();
                        recordingStartTimeRef.current = Date.now();
                    }
                } else {
                    setStatus('idle');
                }
            } catch (error) {
                console.error('Failed to process final transcription:', error);
                setStatus('idle');
                setIsListening(false);
            } finally {
                isProcessingRef.current = false;
            }
        },
        [
            meet.id,
            meet.status,
            meet.title,
            meet.description,
            userId,
            sendMessage,
            playAudio,
            text_to_audio,
            speakTtsStream,
            difyConversationId,
            userMeetId,
        ]
    );

    // 阿里云 ASR hook（需要在 handleFinalTranscription 之后定义，以便在回调中使用）
    // 句子结束仅追加到全文，不自动提交；用户通过「发送」按钮主动结束本轮
    const {
        isConnected: asrConnected,
        isRecording: asrRecording,
        transcript: asrTranscript,
        error: asrError,
        connect: asrConnect,
        startRecording: asrStartRecording,
        stopRecording: asrStopRecording,
        disconnect: asrDisconnect,
        clearTranscript: asrClearTranscript,
    } = useAliyunASR({
        language: 'zh',
        sampleRate: 16000,
        format: 'pcm',
        onError: (error) => {
            console.error('ASR error:', error);
            setStatus('idle');
            setIsListening(false);
        },
    });

    // 实时字幕与 ASR 全文同步（已结束句子 + 当前句中间结果）
    useEffect(() => {
        if (asrMode === 'aliyun') {
            setTranscriptLive(asrTranscript);
        }
    }, [asrMode, asrTranscript]);

    // 将 asrStartRecording 存储到 ref 中，供 handleFinalTranscription 使用
    useEffect(() => {
        asrStartRecordingRef.current = asrStartRecording;
    }, [asrStartRecording]);

    // Dify 方案：开始录音
    const handleStartRecordingDify = useCallback(async () => {
        try {
            await startRecording();
            setStatus('recording');
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    }, [startRecording]);

    // Dify 方案：停止录音并处理
    const handleStopRecordingDify = useCallback(async () => {
        try {
            setStatus('transcribing');

            //1. 停止录音并等待获取blob
            const mp3Blob = await stopRecording();

            if (!mp3Blob) {
                console.error('Failed to get audio blob after stopping recording');
                setStatus('idle');
                return;
            }
            // 2. 使用 Dify 转写音频（上传 + 转文字 封装在一起）
            const mimeType = mp3Blob.type.includes('wav') ? 'audio/wav' : 'audio/mp3';
            const transcriptionText = await transcribeAudioWithDify(mp3Blob, userId, mimeType);
            if (!transcriptionText) {
                throw new Error('Failed to get transcription text');
            }

            // 计算音频时长（从AudioBuffer获取准确时长）
            let audioDuration = 0;
            try {
                const audioContext = new AudioContext();
                const arrayBuffer = await mp3Blob.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                audioDuration = Math.ceil(audioBuffer.duration);
            } catch (error) {
                console.warn('Failed to calculate audio duration, using estimate:', error);
                // 如果计算失败，使用粗略估算
                audioDuration = Math.ceil(mp3Blob.size / 16000);
            }

            // 没有 userMeetId 时无法安全归属数据，直接中止本轮
            if (!userMeetId) {
                console.warn('No userMeetId, skip processing transcription (Dify mode)');
                setStatus('idle');
                return;
            }

            // 发送消息并获取AI回复（SSE 处理已在 API 中完成）
            setStatus('processing');
            const response = await sendMessage({
                meetId: meet.id,
                userId,
                userMeetId,
                audioUrl: ``,
                title: meet.title || '',
                topic: meet.description || '',
                hints: meet.description || '',
                transcriptionText,
                conversation_id: difyConversationId, // 使用全局保存的 conversation_id
                audioDuration,
            });

            // 如果 API 返回了新的 conversation_id，更新全局状态
            // 第一次对话时，API 会返回新的 conversation_id，后续对话使用同一个 ID
            if (response?.conversation_id && response.conversation_id !== difyConversationId) {
                setDifyConversationId(response.conversation_id);
            }

            // 播放AI回复
            setStatus('speaking');

            // 创建对话记录（使用从 API 返回的数据）
            const newConversation: Conversation = {
                id: response?.conversationId || `conv-${Date.now()}`,
                meet_id: meet.id,
                user_id: userId,
                user_meet_id: userMeetId,
                user_audio_url: ``,
                user_message_text: transcriptionText,
                user_audio_duration: audioDuration,
                ai_response_text: response?.aiResponseText || '',
                user_sent_at: response?.userSentAt || new Date().toISOString(),
                ai_responded_at: response?.aiRespondedAt || new Date().toISOString(),
                created_at: new Date().toISOString(),
            };

            setConversations((prev) => [...prev, newConversation]);

            // 播放音频
            try {
                const audioUrl = await text_to_audio(response?.aiResponseText ?? '');
                await playAudio(audioUrl);
            } catch (error) {
                console.error('Failed to play audio:', error);
            }

            setStatus('idle');
        } catch (error) {
            console.error('Failed to process recording:', error);
            setStatus('idle');
        }
    }, [stopRecording, meet.id, meet.title, meet.description, userId, sendMessage, playAudio, text_to_audio, difyConversationId, userMeetId]);

    // 启动会话（阿里云 ASR 方案）
    const startSession = useCallback(async () => {
        try {
            if (!asrConnected) {
                await asrConnect();
                // 等待连接建立
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            setStatus('listening');
            setIsListening(true);
            await asrStartRecording();
            recordingStartTimeRef.current = Date.now();
        } catch (error) {
            console.error('Failed to start session:', error);
            setStatus('idle');
            setIsListening(false);
        }
    }, [asrConnected, asrConnect, asrStartRecording]);

    // 停止会话（阿里云 ASR 方案，含取消）
    const stopSession = useCallback(async () => {
        try {
            setIsListening(false);
            setStatus('idle');
            await asrStopRecording();
            asrClearTranscript();
            await asrDisconnect();
            recordingStartTimeRef.current = null;
            setTranscriptLive('');
        } catch (error) {
            console.error('Failed to stop session:', error);
        }
    }, [asrStopRecording, asrDisconnect, asrClearTranscript]);

    // 发送当前转写内容，结束本轮并触发 AI 回复（阿里云 ASR 方案）
    const handleSendTranscript = useCallback(async () => {
        const text = transcriptLive.trim();
        if (!text) return;
        try {
            await asrStopRecording();
            asrClearTranscript();
            setTranscriptLive('');
            await handleFinalTranscription(text);
        } catch (error) {
            console.error('Failed to send transcript:', error);
            setStatus('idle');
            setIsListening(false);
        }
    }, [transcriptLive, asrStopRecording, asrClearTranscript, handleFinalTranscription]);

    const handleSendTranscriptRef = useRef(handleSendTranscript);
    handleSendTranscriptRef.current = handleSendTranscript;
    const transcriptLiveRef = useRef(transcriptLive);
    transcriptLiveRef.current = transcriptLive;

    // 静音稳定窗口：字幕停止变化超过 silenceStableMs 后自动提交（仅阿里云 + 配置开启）
    useEffect(() => {
        if (asrMode !== 'aliyun' || !aliyunInteraction.silenceAutoCommitEnabled) {
            return;
        }
        const text = transcriptLive.trim();
        if (text.length < aliyunInteraction.minCommitChars) {
            return;
        }
        if (status !== 'listening' && status !== 'recording') {
            return;
        }
        if (isProcessingRef.current) {
            return;
        }

        const id = window.setTimeout(() => {
            if (isProcessingRef.current) {
                return;
            }
            const latest = transcriptLiveRef.current.trim();
            if (latest.length < aliyunInteraction.minCommitChars) {
                return;
            }
            void handleSendTranscriptRef.current();
        }, aliyunInteraction.silenceStableMs);

        return () => clearTimeout(id);
    }, [
        asrMode,
        aliyunInteraction.silenceAutoCommitEnabled,
        aliyunInteraction.silenceStableMs,
        aliyunInteraction.minCommitChars,
        transcriptLive,
        status,
    ]);

    // 统一入口：根据方案选择不同的处理方式
    const handleStartRecording = useCallback(async () => {
        if (asrMode === 'aliyun') {
            // 阿里云 ASR 方案：启动会话（建立连接并开始实时识别）
            await startSession();
        } else {
            // Dify 方案：开始录音
            await handleStartRecordingDify();
        }
    }, [asrMode, handleStartRecordingDify, startSession]);

    const handleStopRecording = useCallback(async () => {
        if (asrMode === 'aliyun') {
            // 阿里云 ASR 方案：
            // 点击“停止对话”时，应停止聆听并断开实时语音识别连接，
            // 下次点击“开始对话”时再重新连接
            await stopSession();
        } else {
            // Dify 方案：停止录音并处理
            await handleStopRecordingDify();
        }
    }, [asrMode, handleStopRecordingDify, stopSession]);


    // 重置 conversation_id（会议结束时调用）
    const resetConversation = useCallback(() => {
        setDifyConversationId('');
        setConversations([]);
        setTranscriptLive('');
        setIsListening(false);
        isProcessingRef.current = false;
        recordingStartTimeRef.current = null;
        // 如果是阿里云 ASR 方案，断开连接
        if (asrMode === 'aliyun') {
            asrDisconnect();
        }
    }, [asrMode, asrDisconnect]);

    const loadConversations = useCallback(async () => {
        // 可以从API加载历史对话
        // const { getConversations } = useConversations();
        // const data = await getConversations({ meetId });
        // if (data) {
        //   setConversations(data.conversations);
        // }
    }, [meet.id]);

    // 清理：组件卸载时停止会话
    useEffect(() => {
        return () => {
            if (asrMode === 'aliyun') {
                stopSession();
            }
        };
    }, [asrMode, stopSession]);

    // 根据方案返回不同的 isRecording 状态
    const currentIsRecording = asrMode === 'aliyun' ? asrRecording : isRecording;

    return {
        conversations,
        status,
        isRecording: currentIsRecording,
        userMeetId,
        userMeetStatus,
        difyConversationId, // 暴露 conversation_id，方便调试
        transcriptLive, // 实时转写字幕（仅阿里云 ASR 方案有效）
        isListening, // 是否在监听状态（仅阿里云 ASR 方案有效）
        asrMode, // 当前使用的 ASR 方案
        handleStartRecording,
        handleStopRecording,
        handleSendTranscript, // 发送当前转写并触发 AI 回复（仅阿里云 ASR 方案）
        startSession,
        stopSession,
        loadConversations,
        resetConversation,
        /** 当前生效的阿里云 ASR 交互配置（静音自动提交、发送/取消按钮等） */
        aliyunInteraction,
    };
};

