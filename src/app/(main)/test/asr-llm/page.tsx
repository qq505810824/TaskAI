'use client';

import { useAliyunAsrConversation } from '@/lib/aliyun-asr';
import { createDifyLlmHandler } from '@/lib/dify-llm';
import { synthesizeTTS } from '@/lib/aliyun-tts';
import type { TtsConfig, TtsHandler } from '@/lib/aliyun-asr';
import { Mic, MicOff, MessageSquare, Play, PlayCircle, Settings2, StopCircle, Wifi, WifiOff } from 'lucide-react';
import { useMemo, useState } from 'react';

const defaultTtsHandler: TtsHandler = async (text: string, config?: TtsConfig): Promise<string> => {
    return synthesizeTTS(text, { voice: config?.voice || 'lydia' });
};

const defaultAudioPlayer = async (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    await audio.play();
};

export default function AliyunAsrLlmTestPage() {
    const [userId, setUserId] = useState<string>('test-user');
    const [title, setTitle] = useState<string>('测试对话');
    const [topic, setTopic] = useState<string>('语音助手');
    const [hints, setHints] = useState<string>('');
    const [voice, setVoice] = useState<string>('lydia');

    const llmHandler = useMemo(() => createDifyLlmHandler(), []);

    const {
        status,
        error,
        transcriptLive,
        session,
        isConnected,
        isRecording,
        startConversation,
        stopConversation,
        cancelCurrentUtterance,
        sendCurrentUtterance,
    } = useAliyunAsrConversation({
        llm: {
            handler: llmHandler,
            meta: {
                userId,
                title,
                topic,
                hints,
            },
        },
        tts: {
            handler: defaultTtsHandler,
            player: defaultAudioPlayer,
            config: { voice },
        },
        autoStart: false,
    });

    const statusTextMap: Record<string, string> = {
        idle: '空闲',
        connecting: '连接中',
        connected: '已连接',
        recording: '录音中',
        listening: '监听中',
        processing: '处理中',
        speaking: '播放中',
        error: '错误',
    };

    const handleToggleConversation = async () => {
        if (isRecording || status === 'recording' || status === 'processing' || status === 'speaking') {
            await stopConversation();
        } else {
            await startConversation();
        }
    };

    const canSend = !!transcriptLive?.trim() && status !== 'processing' && status !== 'speaking';

    return (
        <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Aliyun ASR + Dify LLM 测试</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            实时语音识别（阿里云） + Dify LLM 回复 + 阿里云 TTS 播放
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-white border border-gray-200">
                            <Settings2 className="w-3.5 h-3.5 mr-1" />
                            手动配置 Dify 参数
                        </span>
                    </div>
                </div>

                {/* 会话与 LLM 元信息配置 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                用户 ID（用于区分不同用户）
                            </label>
                            <input
                                type="text"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">标题（title）</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">主题（topic）</label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">提示（hints，可选）</label>
                            <input
                                type="text"
                                value={hints}
                                onChange={(e) => setHints(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">TTS 音色（voice）</label>
                            <input
                                type="text"
                                value={voice}
                                onChange={(e) => setVoice(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* 状态区域 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">ASR 连接状态</div>
                            <div className="flex items-center gap-2">
                                {isConnected ? (
                                    <>
                                        <Wifi className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-green-600 font-semibold">已连接</span>
                                    </>
                                ) : (
                                    <>
                                        <WifiOff className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-500">未连接</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">录音状态</div>
                            <div className="flex items-center gap-2">
                                {isRecording ? (
                                    <>
                                        <Mic className="w-4 h-4 text-red-500" />
                                        <span className="text-sm text-red-600 font-semibold">录音中</span>
                                    </>
                                ) : (
                                    <>
                                        <MicOff className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-500">未录音</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">对话状态</div>
                            <div className="flex items-center gap-2">
                                <PlayCircle className="w-4 h-4 text-indigo-500" />
                                <span className="text-sm text-gray-800">{statusTextMap[status] || status}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 实时字幕 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-500" />
                            <h2 className="text-sm font-semibold text-gray-900">实时字幕</h2>
                        </div>
                        {transcriptLive && (
                            <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                                识别中...
                            </span>
                        )}
                    </div>
                    <div className="min-h-[80px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                        {transcriptLive || <span className="text-gray-400">等待说话...</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleToggleConversation}
                            className={`inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold text-white ${
                                isRecording || status === 'recording'
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            {isRecording || status === 'recording' ? (
                                <>
                                    <StopCircle className="w-4 h-4 mr-1" />
                                    停止对话
                                </>
                            ) : (
                                <>
                                    <Mic className="w-4 h-4 mr-1" />
                                    开始对话
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => void cancelCurrentUtterance()}
                            disabled={!transcriptLive}
                            className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            取消本轮
                        </button>
                        <button
                            type="button"
                            onClick={() => void sendCurrentUtterance()}
                            disabled={!canSend}
                            className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            发送给 LLM
                        </button>
                    </div>
                    {error && (
                        <div className="mt-3 text-xs text-red-600">
                            错误：{error.message}
                        </div>
                    )}
                </div>

                {/* 对话记录 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-indigo-500" />
                            <h2 className="text-sm font-semibold text-gray-900">对话记录</h2>
                            <span className="text-xs text-gray-500">
                                ({session.utterances.length} 轮)
                            </span>
                        </div>
                    </div>
                    {session.utterances.length === 0 ? (
                        <div className="text-sm text-gray-400 py-6 text-center">暂时没有对话记录</div>
                    ) : (
                        <div className="space-y-3 max-h-[360px] overflow-y-auto">
                            {session.utterances.map((utt, index) => (
                                <div
                                    key={utt.id}
                                    className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="text-xs text-gray-500">
                                            第 {index + 1} 轮 ·{' '}
                                            <span className="font-mono">
                                                {new Date(utt.userSentAt).toLocaleTimeString('zh-CN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                        {utt.userAudioDuration > 0 && (
                                            <div className="text-xs text-gray-400">
                                                录音时长：{utt.userAudioDuration} 秒
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-1 text-sm">
                                        <div className="mb-1 flex items-start gap-2">
                                            <span className="font-semibold text-gray-800 shrink-0">用户：</span>
                                            {utt.user_audio_url ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const a = new Audio(utt.user_audio_url!);
                                                        a.play().catch(() => {});
                                                    }}
                                                    className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-600 hover:bg-teal-200"
                                                    title="播放用户录音"
                                                >
                                                    <Play className="w-3 h-3" />
                                                </button>
                                            ) : null}
                                            <span className="text-gray-800">{utt.userText}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-teal-700">LLM：</span>
                                            <span className="text-gray-900">{utt.aiText}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

