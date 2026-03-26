'use client';

import {
    buildSSMLWithBreaks,
    downloadAudio,
    SSML_MAX_LENGTH,
    synthesizeTTS,
    synthesizeTTSFromSSML,
} from '@/lib/aliyun-tts';
import type { SSMLSegment } from '@/lib/aliyun-tts';
import { CheckCircle, Download, Loader2, Pause, Play, Plus, Square, Trash2, Volume2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface TestHistoryItem {
    text: string;
    timestamp: Date;
    success: boolean;
    audioUrl?: string | null;
    voice?: string;
    speechRate?: number;
    isSSML?: boolean;
}

const DEFAULT_SSML_SEGMENT: SSMLSegment = { text: '', breakMs: 0 };
const SSML_BREAK_PRESETS = [
    { value: 0, label: '无' },
    { value: 300, label: '0.3秒' },
    { value: 500, label: '0.5秒' },
    { value: 700, label: '0.7秒' },
    { value: 1000, label: '1秒' },
    { value: 2000, label: '2秒' },
];

export default function TTSTestPage() {
    const [text, setText] = useState('你好，这是一段测试文字。阿里云语音合成功能测试。');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [voice, setVoice] = useState('aiqi');
    const [speechRate, setSpeechRate] = useState<number>(0); // 默认正常速率
    const [testHistory, setTestHistory] = useState<TestHistoryItem[]>([]);
    const [playingHistoryIndex, setPlayingHistoryIndex] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // 带停顿合成 (SSML)：多片段，每段后可设停顿时长
    const [ssmlSegments, setSsmlSegments] = useState<SSMLSegment[]>([
        { text: '第一句话。', breakMs: 500 },
        { text: '第二句话，中间有停顿。', breakMs: 700 },
        { text: '结束。', breakMs: 0 },
    ]);

    const voices = [
        { id: 'aiqi', name: '艾琪（女声，温柔）' },
        { id: 'aiqi_emo', name: '艾琪（情感化）' },
        { id: 'aitong', name: '艾童（童声）' },
        { id: 'aijia', name: '艾佳（女声，知性）' },
        { id: 'aijia_emo', name: '艾佳（情感化）' },
        { id: 'aicheng', name: '艾诚（男声）' },
        { id: 'aicheng_emo', name: '艾诚（情感化）' },
        { id: 'lydia', name: '琳达（女声，中性，英中双语）' }
    ];

    // 语音速率选项（-500 到 500，0 为正常速率）
    const speechRateOptions = [
        { value: -300, label: '很慢' },
        { value: -200, label: '慢速' },
        { value: -100, label: '稍慢' },
        { value: 0, label: '正常' },
        { value: 100, label: '稍快' },
        { value: 200, label: '快速' },
        { value: 300, label: '很快' },
    ];

    // 监听播放状态
    useEffect(() => {
        if (!audioRef.current) return;

        const audio = audioRef.current;

        const updatePlayingState = () => {
            const playing = !audio.paused && !audio.ended;
            setIsPlaying(playing);
            // 如果播放结束，清除历史播放索引
            if (audio.ended && playingHistoryIndex !== null) {
                setPlayingHistoryIndex(null);
            }
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => {
            setIsPlaying(false);
            setPlayingHistoryIndex(null);
        };

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);

        const interval = setInterval(updatePlayingState, 100);

        return () => {
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
            clearInterval(interval);
        };
    }, [audioUrl, playingHistoryIndex]);

    // 下载音频为 MP3（使用组件库的方法）
    const handleDownload = (url: string, filename?: string) => {
        try {
            downloadAudio(url, filename);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to download audio');
        }
    };

    // 播放历史记录中的音频
    const handlePlayHistory = async (historyItem: TestHistoryItem, index: number) => {
        if (!historyItem.audioUrl) {
            setError('该历史记录没有音频');
            return;
        }

        try {
            // 先停止并重置当前音频（如果有）
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            // 设置新的音频源
            if (audioRef.current) {
                audioRef.current.src = historyItem.audioUrl;
                setAudioUrl(historyItem.audioUrl);
                setPlayingHistoryIndex(index);

                // 等待音频加载完成
                await new Promise<void>((resolve, reject) => {
                    if (!audioRef.current) {
                        reject(new Error('Audio element not found'));
                        return;
                    }

                    const audio = audioRef.current;

                    const handleCanPlay = () => {
                        audio.removeEventListener('canplay', handleCanPlay);
                        audio.removeEventListener('error', handleError);
                        resolve();
                    };

                    const handleError = () => {
                        audio.removeEventListener('canplay', handleCanPlay);
                        audio.removeEventListener('error', handleError);
                        reject(new Error('Failed to load audio'));
                    };

                    if (audio.readyState >= 2) {
                        resolve();
                    } else {
                        audio.addEventListener('canplay', handleCanPlay);
                        audio.addEventListener('error', handleError);
                        setTimeout(() => {
                            audio.removeEventListener('canplay', handleCanPlay);
                            audio.removeEventListener('error', handleError);
                            reject(new Error('Audio loading timeout'));
                        }, 10000);
                    }
                });

                // 播放音频
                try {
                    await audioRef.current.play();
                } catch (playError) {
                    if (playError instanceof Error && playError.name !== 'NotAllowedError') {
                        throw playError;
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to play history audio');
            setPlayingHistoryIndex(null);
        }
    };

    // 合成并播放
    const handleSynthesize = async () => {
        if (!text.trim()) {
            setError('请输入要合成的文字');
            return;
        }

        setLoading(true);
        setError(null);
        setIsPlaying(false);

        try {
            // 先停止并重置当前音频（如果有）
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current.src = '';
            }

            const startTime = Date.now();
            const url = await synthesizeTTS(text, { voice, speechRate });
            const duration = Date.now() - startTime;

            setAudioUrl(url);

            // 等待音频元素准备好后再播放
            if (audioRef.current) {
                // 先设置 src，等待加载完成
                audioRef.current.src = url;

                // 等待音频加载完成
                await new Promise<void>((resolve, reject) => {
                    if (!audioRef.current) {
                        reject(new Error('Audio element not found'));
                        return;
                    }

                    const audio = audioRef.current;

                    const handleCanPlay = () => {
                        audio.removeEventListener('canplay', handleCanPlay);
                        audio.removeEventListener('error', handleError);
                        resolve();
                    };

                    const handleError = () => {
                        audio.removeEventListener('canplay', handleCanPlay);
                        audio.removeEventListener('error', handleError);
                        reject(new Error('Failed to load audio'));
                    };

                    // 如果已经可以播放，直接 resolve
                    if (audio.readyState >= 2) {
                        resolve();
                    } else {
                        audio.addEventListener('canplay', handleCanPlay);
                        audio.addEventListener('error', handleError);
                        // 设置超时，避免无限等待
                        setTimeout(() => {
                            audio.removeEventListener('canplay', handleCanPlay);
                            audio.removeEventListener('error', handleError);
                            reject(new Error('Audio loading timeout'));
                        }, 10000);
                    }
                });

                // 播放音频
                try {
                    await audioRef.current.play();
                } catch (playError) {
                    // 忽略用户交互相关的错误（浏览器自动播放策略）
                    if (playError instanceof Error && playError.name !== 'NotAllowedError') {
                        throw playError;
                    }
                }
            }

            setTestHistory((prev) => [
                { text, timestamp: new Date(), success: true, audioUrl: url, voice, speechRate },
                ...prev.slice(0, 9), // 保留最近 10 条
            ]);

            console.log(`TTS synthesis completed in ${duration}ms`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            setTestHistory((prev) => [
                { text, timestamp: new Date(), success: false, voice, speechRate },
                ...prev.slice(0, 9),
            ]);
        } finally {
            setLoading(false);
        }
    };

    // 仅合成，不播放
    const handleSynthesizeOnly = async () => {
        if (!text.trim()) {
            setError('请输入要合成的文字');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 先停止并重置当前音频（如果有）
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current.src = '';
            }

            const startTime = Date.now();
            const url = await synthesizeTTS(text, { voice, speechRate });
            const duration = Date.now() - startTime;

            setAudioUrl(url);
            if (audioRef.current) {
                // 设置 src，但不自动播放
                audioRef.current.src = url;
            }

            setTestHistory((prev) => [
                { text, timestamp: new Date(), success: true, audioUrl: url, voice, speechRate },
                ...prev.slice(0, 9),
            ]);

            console.log(`TTS synthesis completed in ${duration}ms, audio URL: ${url.substring(0, 50)}...`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            setTestHistory((prev) => [
                { text, timestamp: new Date(), success: false, voice, speechRate },
                ...prev.slice(0, 9),
            ]);
        } finally {
            setLoading(false);
        }
    };

    // 播放已合成的音频
    const handlePlay = async () => {
        if (!audioUrl || !audioRef.current) {
            setError('请先合成音频');
            return;
        }

        try {
            const audio = audioRef.current;

            // 如果音频源已改变，重新设置
            if (audio.src !== audioUrl) {
                audio.src = audioUrl;
            }

            // 等待音频加载完成（如果需要）
            if (audio.readyState < 2) {
                await new Promise<void>((resolve, reject) => {
                    const handleCanPlay = () => {
                        audio.removeEventListener('canplay', handleCanPlay);
                        audio.removeEventListener('error', handleError);
                        resolve();
                    };

                    const handleError = () => {
                        audio.removeEventListener('canplay', handleCanPlay);
                        audio.removeEventListener('error', handleError);
                        reject(new Error('Failed to load audio'));
                    };

                    audio.addEventListener('canplay', handleCanPlay);
                    audio.addEventListener('error', handleError);

                    setTimeout(() => {
                        audio.removeEventListener('canplay', handleCanPlay);
                        audio.removeEventListener('error', handleError);
                        reject(new Error('Audio loading timeout'));
                    }, 10000);
                });
            }

            await audio.play();
        } catch (err) {
            // 忽略用户交互相关的错误（浏览器自动播放策略）
            if (err instanceof Error && err.name === 'NotAllowedError') {
                setError('请点击播放按钮手动播放音频');
            } else {
                setError(err instanceof Error ? err.message : 'Failed to play audio');
            }
        }
    };

    // 停止播放
    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    };

    // 暂停/恢复
    const handlePauseResume = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to resume audio');
            });
        }
    };

    // 清除历史
    const handleClearHistory = () => {
        setTestHistory([]);
    };

    // SSML：更新某一片段
    const updateSsmlSegment = (index: number, field: 'text' | 'breakMs', value: string | number) => {
        setSsmlSegments((prev) => {
            const next = [...prev];
            if (field === 'text') next[index] = { ...next[index], text: value as string };
            else next[index] = { ...next[index], breakMs: value as number };
            return next;
        });
    };

    const addSsmlSegment = () => {
        setSsmlSegments((prev) => [...prev, { ...DEFAULT_SSML_SEGMENT }]);
    };

    const removeSsmlSegment = (index: number) => {
        setSsmlSegments((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    };

    const getSsmlDisplayText = () => {
        return buildSSMLWithBreaks(ssmlSegments);
    };

    // 合成带停顿（SSML）并播放
    const handleSynthesizeSSML = async () => {
        const hasText = ssmlSegments.some((s) => s.text.trim());
        if (!hasText) {
            setError('请至少填写一个片段的文字');
            return;
        }

        setLoading(true);
        setError(null);
        setIsPlaying(false);

        try {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current.src = '';
            }

            const ssml = getSsmlDisplayText();
            const startTime = Date.now();
            const url = await synthesizeTTSFromSSML(ssml, { voice, speechRate });
            const duration = Date.now() - startTime;

            setAudioUrl(url);

            if (audioRef.current) {
                audioRef.current.src = url;
                await new Promise<void>((resolve, reject) => {
                    if (!audioRef.current) {
                        reject(new Error('Audio element not found'));
                        return;
                    }
                    const audio = audioRef.current;
                    const handleCanPlay = () => {
                        audio.removeEventListener('canplay', handleCanPlay);
                        audio.removeEventListener('error', handleError);
                        resolve();
                    };
                    const handleError = () => {
                        audio.removeEventListener('canplay', handleCanPlay);
                        audio.removeEventListener('error', handleError);
                        reject(new Error('Failed to load audio'));
                    };
                    if (audio.readyState >= 2) resolve();
                    else {
                        audio.addEventListener('canplay', handleCanPlay);
                        audio.addEventListener('error', handleError);
                        setTimeout(() => {
                            audio.removeEventListener('canplay', handleCanPlay);
                            audio.removeEventListener('error', handleError);
                            reject(new Error('Audio loading timeout'));
                        }, 10000);
                    }
                });
                try {
                    await audioRef.current.play();
                } catch (playError) {
                    if (playError instanceof Error && playError.name !== 'NotAllowedError') throw playError;
                }
            }

            const displayText = ssmlSegments.map((s) => s.text).join(' ');
            setTestHistory((prev) => [
                { text: displayText, timestamp: new Date(), success: true, audioUrl: url, voice, speechRate, isSSML: true },
                ...prev.slice(0, 9),
            ]);
            console.log(`SSML TTS completed in ${duration}ms`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            setTestHistory((prev) => [
                { text: ssmlSegments.map((s) => s.text).join(' '), timestamp: new Date(), success: false, voice, speechRate, isSSML: true },
                ...prev.slice(0, 9),
            ]);
        } finally {
            setLoading(false);
        }
    };

    // 仅合成带停顿，不播放
    const handleSynthesizeSSMLOnly = async () => {
        const hasText = ssmlSegments.some((s) => s.text.trim());
        if (!hasText) {
            setError('请至少填写一个片段的文字');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current.src = '';
            }

            const ssml = getSsmlDisplayText();
            const url = await synthesizeTTSFromSSML(ssml, { voice, speechRate });
            setAudioUrl(url);
            if (audioRef.current) audioRef.current.src = url;

            const displayText = ssmlSegments.map((s) => s.text).join(' ');
            setTestHistory((prev) => [
                { text: displayText, timestamp: new Date(), success: true, audioUrl: url, voice, speechRate, isSSML: true },
                ...prev.slice(0, 9),
            ]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            setTestHistory((prev) => [
                { text: ssmlSegments.map((s) => s.text).join(' '), timestamp: new Date(), success: false, voice, speechRate, isSSML: true },
                ...prev.slice(0, 9),
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">阿里云 TTS 测试页面</h1>
                    <p className="text-gray-600 mb-8">测试阿里云语音合成功能</p>

                    {/* 配置区域 */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">选择音色</label>
                            <select
                                value={voice}
                                onChange={(e) => setVoice(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                {voices.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                语音速率
                                <span className="ml-2 text-xs text-gray-500 font-normal">
                                    ({speechRate === 0 ? '正常' : speechRate > 0 ? `快${speechRate}` : `慢${Math.abs(speechRate)}`})
                                </span>
                            </label>
                            <select
                                value={speechRate}
                                onChange={(e) => setSpeechRate(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                {speechRateOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 输入区域 */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">输入文字</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="请输入要合成的文字..."
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        />
                        <p className="mt-2 text-sm text-gray-500">字符数: {text.length}</p>
                    </div>

                    {/* 带停顿合成 (SSML) */}
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <h3 className="text-sm font-semibold text-amber-900 mb-2">合成带停顿的语音 (SSML)</h3>
                        <p className="text-xs text-amber-700 mb-3">
                            添加多个片段，为每个片段设置其后的停顿时长，合成后句间会有相应停顿。阿里云要求 SSML 总长度 &lt; 300 字符（含标签），超出时请缩短内容。
                        </p>
                        <div className="space-y-3 mb-3">
                            {ssmlSegments.map((seg, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="flex-1 min-w-0">
                                        <input
                                            type="text"
                                            value={seg.text}
                                            onChange={(e) => updateSsmlSegment(index, 'text', e.target.value)}
                                            placeholder="片段文字"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                                        />
                                    </div>
                                    <div className="w-28 shrink-0">
                                        <select
                                            value={seg.breakMs ?? 0}
                                            onChange={(e) => updateSsmlSegment(index, 'breakMs', Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                                        >
                                            {SSML_BREAK_PRESETS.map((p) => (
                                                <option key={p.value} value={p.value}>
                                                    {p.label}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="text-xs text-amber-600 block mt-0.5">其后停顿</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeSsmlSegment(index)}
                                        disabled={ssmlSegments.length <= 1}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                        title="删除片段"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {(() => {
                            const ssmlLength = getSsmlDisplayText().length;
                            const ssmlOverLimit = ssmlLength >= SSML_MAX_LENGTH;
                            return (
                                <>
                                    <p className={`text-xs mb-2 ${ssmlOverLimit ? 'text-red-600 font-medium' : 'text-amber-700'}`}>
                                        SSML 长度：{ssmlLength} / {SSML_MAX_LENGTH} 字符
                                        {ssmlOverLimit && '（超出限制，请缩短内容或减少片段）'}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={addSsmlSegment}
                                            className="flex items-center gap-1 px-3 py-2 text-amber-800 bg-amber-100 rounded-lg hover:bg-amber-200 text-sm"
                                        >
                                            <Plus className="w-4 h-4" />
                                            添加片段
                                        </button>
                                        <button
                                            onClick={handleSynthesizeSSML}
                                            disabled={loading || !ssmlSegments.some((s) => s.text.trim()) || ssmlOverLimit}
                                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                                            合成并播放（带停顿）
                                        </button>
                                        <button
                                            onClick={handleSynthesizeSSMLOnly}
                                            disabled={loading || !ssmlSegments.some((s) => s.text.trim()) || ssmlOverLimit}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                            仅合成（带停顿）
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
                        <details className="mt-3">
                            <summary className="text-xs text-amber-700 cursor-pointer">查看生成的 SSML</summary>
                            <pre className="mt-2 p-2 bg-white border border-amber-200 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
                                {getSsmlDisplayText()}
                            </pre>
                        </details>
                    </div>

                    {/* 错误提示 */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex flex-wrap gap-4 mb-6">
                        <button
                            onClick={handleSynthesize}
                            disabled={loading || !text.trim()}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>合成中...</span>
                                </>
                            ) : (
                                <>
                                    <Volume2 className="w-5 h-5" />
                                    <span>合成并播放</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleSynthesizeOnly}
                            disabled={loading || !text.trim()}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>合成中...</span>
                                </>
                            ) : (
                                <>
                                    <Volume2 className="w-5 h-5" />
                                    <span>仅合成</span>
                                </>
                            )}
                        </button>

                        {audioUrl && (
                            <>
                                <button
                                    onClick={handlePlay}
                                    disabled={isPlaying}
                                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Play className="w-5 h-5" />
                                    <span>播放</span>
                                </button>

                                <button
                                    onClick={handlePauseResume}
                                    disabled={!isPlaying && !audioUrl}
                                    className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Pause className="w-5 h-5" />
                                    <span>{isPlaying ? '暂停' : '恢复'}</span>
                                </button>

                                <button
                                    onClick={handleStop}
                                    disabled={!isPlaying}
                                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Square className="w-5 h-5" />
                                    <span>停止</span>
                                </button>

                                <button
                                    onClick={() => handleDownload(audioUrl, `tts-${Date.now()}.mp3`)}
                                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    <Download className="w-5 h-5" />
                                    <span>下载 MP3</span>
                                </button>
                            </>
                        )}
                    </div>

                    {/* 播放状态 */}
                    {isPlaying && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                            <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                            <p className="text-green-700">正在播放...</p>
                        </div>
                    )}

                    {/* 音频 URL 显示 */}
                    {audioUrl && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm font-medium text-blue-900 mb-2">音频已合成</p>
                            <p className="text-xs text-blue-700">格式: Data URL (Base64)</p>
                            {/* 隐藏的 audio 元素用于播放 */}
                            <audio ref={audioRef} src={audioUrl} className="hidden" />
                        </div>
                    )}

                    {/* 测试历史 */}
                    {testHistory.length > 0 && (
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">测试历史</h2>
                                <button
                                    onClick={handleClearHistory}
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                >
                                    清除
                                </button>
                            </div>
                            <div className="space-y-2">
                                {testHistory.map((item, index) => (
                                    <div
                                        key={index}
                                        className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${playingHistoryIndex === index && isPlaying
                                            ? 'bg-indigo-50 border-2 border-indigo-300'
                                            : 'bg-gray-50'
                                            }`}
                                    >
                                        {item.success ? (
                                            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900">{item.text}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-gray-500">
                                                    {item.timestamp.toLocaleTimeString()}
                                                </p>
                                                {item.voice && (
                                                    <span className="text-xs text-gray-400">
                                                        • {voices.find((v) => v.id === item.voice)?.name || item.voice}
                                                    </span>
                                                )}
                                                {item.speechRate !== undefined && item.speechRate !== 0 && (
                                                    <span className="text-xs text-gray-400">
                                                        • 速率: {speechRateOptions.find((o) => o.value === item.speechRate)?.label || item.speechRate}
                                                    </span>
                                                )}
                                                {item.isSSML && (
                                                    <span className="text-xs text-amber-600 font-medium">• 带停顿</span>
                                                )}
                                                {playingHistoryIndex === index && isPlaying && (
                                                    <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        播放中
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {item.success && item.audioUrl && (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handlePlayHistory(item, index)}
                                                    disabled={isPlaying && playingHistoryIndex !== index}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    title="播放音频"
                                                >
                                                    <Play className="w-4 h-4" />
                                                    <span>播放</span>
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDownload(
                                                            item.audioUrl!,
                                                            `tts-${item.timestamp.getTime()}.mp3`
                                                        )
                                                    }
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 transition-colors"
                                                    title="下载 MP3"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    <span>下载</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 使用说明 */}
                    <div className="mt-8 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <h3 className="text-sm font-semibold text-indigo-900 mb-2">使用说明</h3>
                        <ul className="text-sm text-indigo-700 space-y-1">
                            <li>• 输入要合成的文字，选择音色、语音速率</li>
                            <li>• 点击"合成并播放"会自动合成并播放音频</li>
                            <li>• 点击"仅合成"只生成音频 URL，不自动播放</li>
                            <li>• <strong>带停顿合成 (SSML)</strong>：添加多个片段并为每段设置其后停顿时长，可合成句间带自定义停顿的语音</li>
                            <li>• 合成后的音频可以手动播放、暂停、停止、下载 MP3</li>
                            <li>• 测试历史会记录最近 10 次测试结果</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
