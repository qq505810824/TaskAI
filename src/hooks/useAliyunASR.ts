import { useCallback, useEffect, useRef, useState } from 'react';

interface ASRToken {
    token: string;
    expireTime: number;
    appKey: string;
    region: string;
}

interface UseAliyunASROptions {
    language?: string; // 语言代码，如 'zh'、'en'
    sampleRate?: number; // 采样率，如 16000
    format?: string; // 音频格式，如 'pcm'
    onPartialResult?: (text: string) => void; // 部分识别结果回调
    onFinalResult?: (text: string) => void; // 最终识别结果回调
    onError?: (error: Error) => void; // 错误回调
}

/** 等待 WebSocket 变为 OPEN，避免在会议流程中连接未就绪就发 StartTranscription */
function waitForWebSocketOpen(
    wsRef: { current: WebSocket | null },
    timeoutMs: number
): Promise<void> {
    return new Promise((resolve, reject) => {
        const ws = wsRef.current;
        if (!ws) {
            reject(new Error('No WebSocket'));
            return;
        }
        if (ws.readyState === WebSocket.OPEN) {
            resolve();
            return;
        }
        const timer = setTimeout(() => {
            ws.removeEventListener('open', onOpen);
            ws.removeEventListener('error', onError);
            reject(new Error(`WebSocket open timeout after ${timeoutMs}ms`));
        }, timeoutMs);
        const onOpen = () => {
            clearTimeout(timer);
            ws.removeEventListener('open', onOpen);
            ws.removeEventListener('error', onError);
            resolve();
        };
        const onError = () => {
            clearTimeout(timer);
            ws.removeEventListener('open', onOpen);
            ws.removeEventListener('error', onError);
            reject(new Error('WebSocket connection error'));
        };
        ws.addEventListener('open', onOpen);
        ws.addEventListener('error', onError);
    });
}

// 生成 message_id（阿里云要求：32位十六进制字符串，不带连字符）
function generateMessageId(): string {
    // 生成 32 位十六进制字符串（类似 UUID 但无连字符）
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
}

export const useAliyunASR = (options: UseAliyunASROptions = {}) => {
    const {
        language = 'zh',
        sampleRate = 16000,
        format = 'pcm',
        onPartialResult,
        onFinalResult,
        onError,
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    /** 已结束的句子拼接成的全文（SentenceEnd 时追加，不触发结束） */
    const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
    /** 当前句子的中间识别结果（TranscriptionResultChanged） */
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    /** 对外暴露的全文：已结束句子 + 当前句中间结果 */
    const transcript = accumulatedTranscript + (interimTranscript ? (accumulatedTranscript ? ' ' : '') + interimTranscript : '');

    const wsRef = useRef<WebSocket | null>(null);
    const tokenRef = useRef<ASRToken | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const isStartSentRef = useRef<boolean>(false); // 标记是否已发送 StartTranscription
    const taskIdRef = useRef<string | null>(null);
    const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null); // StopTranscription 超时关闭连接
    const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 长时间未说话的空闲超时
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    // 保证 WebSocket 回调中始终调用最新的 setState，避免闭包陈旧导致界面不更新
    const setAccumulatedRef = useRef(setAccumulatedTranscript);
    const setInterimRef = useRef(setInterimTranscript);
    setAccumulatedRef.current = setAccumulatedTranscript;
    setInterimRef.current = setInterimTranscript;

    // 检查 Token 是否有效（未过期）
    const isTokenValid = useCallback((token: ASRToken | null): boolean => {
        if (token && token.token) {
            return true
        }
        return false;
    }, []);

    // 获取 Token
    const fetchToken = useCallback(async (): Promise<ASRToken> => {
        try {
            const response = await fetch('/api/asr/token');
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch token');
            }

            return data.data;
        } catch (err) {
            throw new Error(`Failed to fetch ASR token: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
    }, []);

    // 获取有效的 Token（如果已有有效 token 则复用，否则获取新的）
    const getValidToken = useCallback(async (): Promise<ASRToken> => {
        // 检查当前 token 是否有效
        if (isTokenValid(tokenRef.current)) {
            console.log('Reusing existing valid token');
            return tokenRef.current!;
        }

        // Token 不存在或已过期，获取新 token
        console.log('Fetching new token (token expired or not exists)');
        const tokenData = await fetchToken();
        console.log('tokenData', tokenData);
        tokenRef.current = tokenData;
        return tokenData;
    }, [isTokenValid, fetchToken]);

    // 初始化 WebSocket 连接
    const connect = useCallback(async () => {
        try {
            // 获取有效的 Token（复用已有 token 或获取新 token）
            const tokenData = await getValidToken();

            // 构建 WebSocket URL
            const wsUrl = `wss://nls-gateway.${tokenData.region}.aliyuncs.com/ws/v1?token=${tokenData.token}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Aliyun ASR WebSocket connected');
                setIsConnected(true);
                setError(null);
                // 仅重置标记与 taskId，不在这里发送 StartTranscription，避免连接后长时间空闲
                isStartSentRef.current = false;
                taskIdRef.current = generateMessageId();
            };

            ws.onmessage = (event) => {
                try {
                    // console.log('event.data', event.data);
                    const message = JSON.parse(event.data);
                    const { header, payload } = message || {};

                    // 安全检查：确保 header 存在
                    if (!header || !header.name) {
                        console.warn('Received message without header:', message);
                        return;
                    }

                    // 处理 StartTranscription 的响应
                    if (header.name === 'StartTranscription') {
                        console.log('StartTranscription response received:', message);
                        if (header.status !== 20000000) {
                            // StartTranscription 失败
                            const errorMsg =
                                header.status_text ||
                                payload?.message ||
                                `StartTranscription failed with status: ${header.status || 'unknown'}`;
                            const error = new Error(errorMsg);
                            setError(errorMsg);
                            onError?.(error);
                            console.error('StartTranscription failed:', {
                                status: header.status,
                                status_text: header.status_text,
                                payload,
                            });
                        } else {
                            console.log('StartTranscription successful, ready to receive audio');
                        }
                        return;
                    }

                    if (header.name === 'TranscriptionResultChanged') {
                        // 有识别结果，清除空闲定时器
                        if (idleTimeoutRef.current) {
                            clearTimeout(idleTimeoutRef.current);
                            idleTimeoutRef.current = null;
                        }
                        // 中间结果（当前句子的部分识别），用 ref 确保调用最新 setState
                        const text = (payload?.result ?? payload?.sentence?.text ?? '') || '';
                        setInterimRef.current(text);
                        onPartialResult?.(text);
                    } else if (header.name === 'TranscriptionCompleted') {
                        // 整段转写结束（如 Stop 后服务端返回），仍通知最终结果
                        if (idleTimeoutRef.current) {
                            clearTimeout(idleTimeoutRef.current);
                            idleTimeoutRef.current = null;
                        }
                        const text = (payload?.result ?? payload?.sentence?.text ?? '') || '';
                        if (text) {
                            setAccumulatedRef.current((prev: string) => prev + (prev ? ' ' : '') + text);
                            setInterimRef.current('');
                        }
                        console.log('TranscriptionCompleted payload:', payload);
                        onFinalResult?.(text);
                    } else if (header.name === 'StopTranscription') {
                        // StopTranscription 响应
                        console.log('StopTranscription response received:', message);
                        // 清除超时定时器
                        if (stopTimeoutRef.current) {
                            clearTimeout(stopTimeoutRef.current);
                            stopTimeoutRef.current = null;
                        }
                        // 收到响应后关闭 WebSocket 连接
                        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                            console.log('Closing WebSocket after StopTranscription response');
                            wsRef.current.close();
                        }
                        return;
                    } else if (header.name === 'TaskFailed') {
                        // 任务失败
                        // 错误信息可能在 header.status_text、payload.message 或 header.message 中
                        const errorMsg =
                            header.status_text ||
                            payload?.message ||
                            payload?.error ||
                            header.message ||
                            `Task failed with status: ${header.status || 'unknown'}`;

                        const isIdleTimeout =
                            typeof errorMsg === 'string' &&
                            errorMsg.toUpperCase().includes('IDLE_TIMEOUT');

                        if (isIdleTimeout) {
                            // 网关空闲超时：说明长时间未说话或未发送音频，阿里云主动断开任务
                            console.warn('Aliyun ASR idle timeout, closing WebSocket and resetting state');
                            // 这里不把它当成“错误”展示给用户，只是重置连接，下一次开始录音会自动重连
                            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                                wsRef.current.close();
                            }
                            // 其余清理逻辑在 onclose 中统一处理
                        } else {
                            // 非空闲超时的错误，才透出给外层
                            setError(errorMsg);
                            onError?.(new Error(errorMsg));
                        }

                    } else if (header.name === 'SentenceBegin') {
                        // 句子开始，清除空闲定时器
                        if (idleTimeoutRef.current) {
                            clearTimeout(idleTimeoutRef.current);
                            idleTimeoutRef.current = null;
                        }
                        // 句子开始
                        console.log('Sentence begin', payload);
                    } else if (header.name === 'SentenceEnd') {
                        // 句子结束：仅追加到全文，不结束对话；用户通过「发送」按钮主动结束
                        if (idleTimeoutRef.current) {
                            clearTimeout(idleTimeoutRef.current);
                            idleTimeoutRef.current = null;
                        }
                        const text = (payload?.result ?? payload?.sentence?.text ?? '') || '';
                        console.log('Sentence end with text:', text);
                        if (text) {
                            setAccumulatedRef.current((prev: string) => prev + (prev ? ' ' : '') + text);
                            setInterimRef.current('');
                        }
                        // 不再在此处 stopRecording 或调用 onFinalResult
                    } else {
                        // 其他消息类型，记录日志以便调试
                        console.log('Received message:', header.name, payload);
                    }
                } catch (err) {
                    console.error('Error parsing WebSocket message:', err);
                    console.error('Raw message data:', event.data);
                }
            };

            ws.onerror = (event) => {
                console.error('WebSocket error:', event);
                const error = new Error('WebSocket connection error');
                setError(error.message);
                onError?.(error);
            };

            ws.onclose = () => {
                console.log('Aliyun ASR WebSocket closed');
                setIsConnected(false);
                isStartSentRef.current = false; // 重置标记
                taskIdRef.current = null; // 重置 task_id
                // 清除超时定时器
                if (stopTimeoutRef.current) {
                    clearTimeout(stopTimeoutRef.current);
                    stopTimeoutRef.current = null;
                }
                // 清除空闲定时器
                if (idleTimeoutRef.current) {
                    clearTimeout(idleTimeoutRef.current);
                    idleTimeoutRef.current = null;
                }
            };
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error.message);
            onError?.(error);
        }
    }, [getValidToken, format, sampleRate, onPartialResult, onFinalResult, onError]);

    // 清空已累积的转写（用于取消或新一轮开始前）
    const clearTranscript = useCallback(() => {
        setAccumulatedTranscript('');
        setInterimTranscript('');
    }, []);

    // 开始录音并发送音频流
    const startRecording = useCallback(async () => {
        try {
            clearTranscript();
            // 仅当没有可用连接时才 connect（不依赖 isConnected 状态，避免会议流程中闭包陈旧）
            const needConnect =
                !wsRef.current ||
                wsRef.current.readyState === WebSocket.CLOSED ||
                wsRef.current.readyState === WebSocket.CLOSING;
            if (needConnect) {
                await connect();
            }
            // 必须等待 WebSocket 真正 OPEN 再发 StartTranscription，否则会议流程中会因固定延迟不足导致未发送就发音频
            if (!wsRef.current) {
                throw new Error('WebSocket not created');
            }
            await waitForWebSocketOpen(wsRef, 10000);

            // 首次开始录音时发送 StartTranscription，避免长时间空闲
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isStartSentRef.current) {
                const appKey = tokenRef.current?.appKey || '';
                if (!taskIdRef.current) {
                    taskIdRef.current = generateMessageId();
                }

                const startParams = {
                    header: {
                        appkey: appKey,
                        message_id: generateMessageId(), // 使用 32 位十六进制字符串
                        task_id: taskIdRef.current, // 使用 32 位十六进制字符串
                        namespace: 'SpeechTranscriber',
                        name: 'StartTranscription',
                        status: 3, // 3 表示请求
                    },
                    payload: {
                        appkey: appKey,
                        format: format,
                        sample_rate: sampleRate,
                        enable_intermediate_result: true, // 启用中间结果
                        enable_punctuation_prediction: true, // 启用标点预测
                        enable_inverse_text_normalization: true, // 启用ITN
                    },
                };

                // console.log('Sending StartTranscription (on startRecording):', JSON.stringify(startParams, null, 2));
                wsRef.current.send(JSON.stringify(startParams));
                isStartSentRef.current = true;
            }

            // 获取麦克风权限
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: sampleRate,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            mediaStreamRef.current = stream;

            // 同时用 MediaRecorder 录制一份可播放的音频，供会话记录回放
            recordedChunksRef.current = [];
            try {
                const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
                const mr = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
                mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
                mr.start(200);
                mediaRecorderRef.current = mr;
            } catch (_) {
                mediaRecorderRef.current = null;
            }

            // 创建 AudioContext
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: sampleRate,
            });
            audioContextRef.current = audioContext;

            // 创建音频源
            const source = audioContext.createMediaStreamSource(stream);

            // 创建 ScriptProcessorNode（用于处理音频数据）
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (event) => {
                // 注意：这里不能使用 isRecording 状态，因为闭包问题
                // 直接检查 WebSocket 状态即可
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                    return;
                }

                const inputData = event.inputBuffer.getChannelData(0);

                // 转换为 Int16 PCM
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    // 将 Float32 (-1.0 到 1.0) 转换为 Int16 (-32768 到 32767)
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }

                // 发送音频数据到阿里云
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(pcmData.buffer);
                }
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            setIsRecording(true);

            // 启动空闲超时：如果 10 秒内没有任何识别结果，则自动断开连接
            // if (idleTimeoutRef.current) {
            //     clearTimeout(idleTimeoutRef.current);
            // }
            // idleTimeoutRef.current = setTimeout(() => {
            //     console.warn('ASR idle timeout: no speech detected for 10 seconds, disconnecting');
            //     const idleError = new Error('长时间未说话，连接已断开，请点击开始录音重新连接');
            //     setError(idleError.message);
            //     onError?.(idleError);
            //     // 停止录音并断开连接
            //     stopRecording();
            //     if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            //         wsRef.current.close();
            //     }
            //     idleTimeoutRef.current = null;
            // }, 10000);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to start recording');
            setError(error.message);
            onError?.(error);
        }
    }, [isConnected, connect, sampleRate, onError, clearTranscript]);

    // 停止录音，返回本段录制的音频 Blob（用于保存到会话记录）
    const stopRecording = useCallback((): Promise<Blob | null> => {
        const finish = (blob: Blob | null) => {
            setIsRecording(false);
            if (idleTimeoutRef.current) {
                clearTimeout(idleTimeoutRef.current);
                idleTimeoutRef.current = null;
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach((track) => track.stop());
                mediaStreamRef.current = null;
            }
            if (processorRef.current) {
                processorRef.current.disconnect();
                processorRef.current = null;
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
            if (
                wsRef.current &&
                wsRef.current.readyState === WebSocket.OPEN &&
                isStartSentRef.current &&
                taskIdRef.current
            ) {
                const stopParams = {
                    header: {
                        appkey: tokenRef.current?.appKey,
                        message_id: generateMessageId(),
                        task_id: taskIdRef.current,
                        namespace: 'SpeechTranscriber',
                        name: 'StopTranscription',
                        status: 3,
                    },
                };
                wsRef.current.send(JSON.stringify(stopParams));
                stopTimeoutRef.current = setTimeout(() => {
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.close();
                    }
                    stopTimeoutRef.current = null;
                }, 3000);
            }
        };

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            const mr = mediaRecorderRef.current;
            mediaRecorderRef.current = null;
            return new Promise<Blob | null>((resolve) => {
                mr.onstop = () => {
                    const blob =
                        recordedChunksRef.current.length > 0
                            ? new Blob(recordedChunksRef.current, { type: mr.mimeType || 'audio/webm' })
                            : null;
                    recordedChunksRef.current = [];
                    finish(blob);
                    resolve(blob);
                };
                mr.stop();
            });
        }
        recordedChunksRef.current = [];
        finish(null);
        return Promise.resolve(null);
    }, []);

    // 断开连接
    const disconnect = useCallback(() => {
        stopRecording();

        // 清除超时定时器
        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
        }
        // 清除空闲定时器
        if (idleTimeoutRef.current) {
            clearTimeout(idleTimeoutRef.current);
            idleTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setIsConnected(false);
        isStartSentRef.current = false; // 重置标记
        taskIdRef.current = null; // 重置 task_id
    }, [stopRecording]);

    // 清理资源
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        isConnected,
        isRecording,
        transcript,
        error,
        connect,
        startRecording,
        stopRecording,
        disconnect,
        clearTranscript,
    };
};
