'use client';

import { useAliyunASR } from '@/hooks/useAliyunASR';
import { CheckCircle, Mic, MicOff, Wifi, WifiOff, XCircle } from 'lucide-react';
import { useState } from 'react';

export default function ASRTestPage() {
    const [finalTexts, setFinalTexts] = useState<string[]>([]);

    const {
        isConnected,
        isRecording,
        transcript,
        error,
        connect,
        startRecording,
        stopRecording,
        disconnect,
    } = useAliyunASR({
        language: 'zh',
        sampleRate: 16000,
        format: 'pcm',
        onPartialResult: (text) => {
            console.log('Partial result:', text);
        },
        onFinalResult: (text) => {
            console.log('Final result:', text);
            if (text) {
                setFinalTexts((prev) => [...prev, text]);
            }
        },
        onError: (error) => {
            console.error('ASR error:', error);
        },
    });

    const handleToggleRecording = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            if (!isConnected) {
                await connect();
                // 等待连接建立
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            await startRecording();
        }
    };

    const handleClearResults = () => {
        setFinalTexts([]);
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* 头部 */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">阿里云实时语音识别测试</h1>
                    <p className="text-gray-600">测试 Streaming ASR 功能</p>
                </div>

                {/* 状态卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* 连接状态 */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">连接状态</span>
                            {isConnected ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {isConnected ? (
                                <>
                                    <Wifi className="w-4 h-4 text-green-500" />
                                    <span className="text-green-600 font-semibold">已连接</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">未连接</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 录音状态 */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">录音状态</span>
                            {isRecording ? (
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            ) : (
                                <div className="w-3 h-3 bg-gray-300 rounded-full" />
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {isRecording ? (
                                <>
                                    <MicOff className="w-4 h-4 text-red-500" />
                                    <span className="text-red-600 font-semibold">录音中</span>
                                </>
                            ) : (
                                <>
                                    <Mic className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">未录音</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        <div className="flex items-start gap-2">
                            <XCircle className="w-5 h-5 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <div className="font-semibold mb-1">错误信息</div>
                                <div className="text-sm whitespace-pre-wrap wrap-break-word">{error}</div>
                                <div className="mt-2 text-xs text-red-600">
                                    <div>提示：请检查：</div>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        <li>环境变量是否正确配置（.env.local）</li>
                                        <li>AccessKey 是否有智能语音交互服务权限</li>
                                        <li>查看服务器控制台日志获取详细错误信息</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 实时识别区域 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">实时识别</h2>
                        {transcript && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">实时更新</span>
                        )}
                    </div>
                    <div className="min-h-[120px] bg-gray-50 rounded-lg p-4 border border-gray-200">
                        {transcript ? (
                            <p className="text-lg text-gray-900 leading-relaxed">{transcript}</p>
                        ) : (
                            <p className="text-gray-400 italic">等待说话...</p>
                        )}
                    </div>
                </div>

                {/* 最终结果列表 */}
                {finalTexts.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">识别结果</h2>
                            <button
                                onClick={handleClearResults}
                                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                清空
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                            {finalTexts.map((text, index) => (
                                <div
                                    key={index}
                                    className="bg-green-50 border border-green-200 rounded-lg p-4"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                                            {index + 1}
                                        </div>
                                        <p className="text-gray-900 flex-1">{text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 控制按钮 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* 连接/断开按钮 */}
                        <button
                            onClick={isConnected ? disconnect : connect}
                            disabled={isRecording}
                            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${isConnected
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isConnected ? '断开连接' : '连接服务'}
                        </button>

                        {/* 开始/停止录音按钮 */}
                        <button
                            onClick={handleToggleRecording}
                            disabled={!isConnected}
                            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${isRecording
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isRecording ? (
                                <>
                                    <MicOff className="w-5 h-5" />
                                    停止录音
                                </>
                            ) : (
                                <>
                                    <Mic className="w-5 h-5" />
                                    开始录音
                                </>
                            )}
                        </button>
                    </div>

                    {/* 使用说明 */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">使用说明：</h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>1. 首先点击「连接服务」建立 WebSocket 连接</li>
                            <li>2. 连接成功后，点击「开始录音」开始语音识别</li>
                            <li>3. 说话时，实时识别结果会显示在上方</li>
                            <li>4. 停止说话后，最终识别结果会添加到结果列表中</li>
                            <li>5. 点击「停止录音」结束当前识别会话</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
