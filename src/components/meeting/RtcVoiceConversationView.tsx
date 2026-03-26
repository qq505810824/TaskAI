'use client';

import type { Conversation, Meet } from '@/types/meeting';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, Lock, Mic, MicOff, Phone, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AIAvatar } from './AIAvatar';
import { ExitConfirmModal } from './ExitConfirmModal';
import { StatusIndicator } from './StatusIndicator';

type RtcStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking';
type IndicatorStatus = 'idle' | 'recording' | 'transcribing' | 'processing' | 'speaking' | 'listening';

interface RtcVoiceConversationViewProps {
    meet: Meet;
    conversations: Conversation[];
    rtcStatus: RtcStatus;
    isRecording: boolean;
    /** 当前用户在该会议下的 user_meets.status（in_progress/completed/cancelled/...） */
    userMeetStatus?: string | null;
    /** 当前用户在该会议下的 user_meets.id，用于精确查看个人结果 */
    userMeetId?: string | null;

    /** 学生实时字幕（interim） */
    studentDraftLive?: string;
    /** 老师实时字幕（interim） */
    teacherDraftLive?: string;
    /** 实时老师音频流（MediaStream），用于 audio.srcObject 播放 */
    teacherAudioStream?: MediaStream | null;

    onStartRecording: () => void;
    onStopRecording: () => void;
    onEndMeeting?: () => void;
    /** 退出会议并清除内容的回调 */
    onExitConfirm?: () => void;
}

export const RtcVoiceConversationView = ({
    meet,
    conversations,
    rtcStatus,
    isRecording,
    userMeetStatus,
    userMeetId,
    teacherDraftLive,
    studentDraftLive,
    teacherAudioStream,
    onStartRecording,
    onStopRecording,
    onEndMeeting,
    onExitConfirm,
}: RtcVoiceConversationViewProps) => {
    const router = useRouter();
    const [time, setTime] = useState(0);
    const [showExitModal, setShowExitModal] = useState(false);

    const isUserEnded = userMeetStatus === 'completed' || userMeetStatus === 'cancelled';
    const isMeetEnded = meet.status === 'ended' || meet.status === 'cancelled';
    const isEnded = isUserEnded || isMeetEnded;

    useEffect(() => {
        // 仅在非结束状态且 RTC 已连接（非 idle/connecting）时开始计时
        const isTimerActive = !isEnded && rtcStatus !== 'idle' && rtcStatus !== 'connecting';
        if (isTimerActive) {
            const timer = setInterval(() => setTime((t) => t + 1), 1000);
            return () => clearInterval(timer);
        }
    }, [isEnded, rtcStatus]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusText = (status: string) => {
        const statusMap: Record<string, string> = {
            pending: '待开始',
            ongoing: '进行中',
            ended: '已结束',
            cancelled: '已取消',
        };
        return statusMap[status] || status;
    };

    const indicatorStatus: IndicatorStatus = useMemo(() => {
        switch (rtcStatus) {
            case 'idle':
                return 'idle';
            case 'connecting':
                return 'recording';
            case 'listening':
                return 'listening';
            case 'thinking':
                return 'processing';
            case 'speaking':
                return 'speaking';
            default:
                return 'idle';
        }
    }, [rtcStatus]);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        if (!teacherAudioStream) return;

        try {
            a.srcObject = teacherAudioStream as unknown as MediaStream;
            void a.play();
        } catch {
            // Autoplay may be blocked; user can press Play on the controls.
        }
    }, [teacherAudioStream]);

    const bottomRef = useRef<HTMLDivElement | null>(null);
    const lastScrollAtRef = useRef<number>(0);
    const lastDraftScrollAtRef = useRef<number>(0);

    const hasLiveContent =
        conversations.some((c) => Boolean(c.user_message_text?.trim()) || Boolean(c.ai_response_text?.trim())) ||
        Boolean((teacherDraftLive ?? '').trim()) ||
        Boolean((studentDraftLive ?? '').trim());

    const lastConversation = conversations.length > 0 ? conversations[conversations.length - 1] : null;
    const hasLatestAiFinal = Boolean(lastConversation?.ai_response_text?.trim());

    // interim 直接展示（不做尾部高亮）
    // interim stream：直接用 studentDraftLive/teacherDraftLive，不做缓冲累积

    // 1) AI definite（最终回复落入 conversations.ai_response_text）时：一定滚动到底部
    useEffect(() => {
        if (!hasLatestAiFinal) return;
        if (!bottomRef.current) return;

        const now = Date.now();
        if (now - lastScrollAtRef.current < 150) return;
        lastScrollAtRef.current = now;

        bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [hasLatestAiFinal, lastConversation?.ai_responded_at]);

    // 2) interim：只要草稿变化就滚动到底部（节流到很小间隔，避免抖动）
    useEffect(() => {
        const hasDraftNow = Boolean((teacherDraftLive ?? '').trim()) || Boolean((studentDraftLive ?? '').trim());
        if (!hasDraftNow) return;
        if (!bottomRef.current) return;

        const now = Date.now();
        if (now - lastDraftScrollAtRef.current < 120) return;
        lastDraftScrollAtRef.current = now;

        bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [teacherDraftLive, studentDraftLive]);

    // interim 直接展示（不做学生/AI 尾部高亮）

    const [studentDraftTimeIso, setStudentDraftTimeIso] = useState<string | null>(null);
    const [teacherDraftTimeIso, setTeacherDraftTimeIso] = useState<string | null>(null);

    useEffect(() => {
        if (studentDraftLive && studentDraftLive.trim()) {
            window.setTimeout(() => setStudentDraftTimeIso(new Date().toISOString()), 0);
        }
    }, [studentDraftLive]);

    useEffect(() => {
        if (teacherDraftLive && teacherDraftLive.trim()) {
            window.setTimeout(() => setTeacherDraftTimeIso(new Date().toISOString()), 0);
        }
    }, [teacherDraftLive]);

    const formatClock = (iso: string | null | undefined) => {
        if (!iso) return '';
        try {
            return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    // interim 不做尾部高亮

    const handleBackClick = () => {
        if (!isEnded && userMeetStatus === 'in_progress') {
            setShowExitModal(true);
        } else {
            router.back();
        }
    };

    const handleConfirmExit = () => {
        setShowExitModal(false);
        if (onExitConfirm) {
            onExitConfirm();
        } else {
            router.back();
        }
    };

    const handleGoToSummary = () => {
        if (isEnded) {
            const summaryUrl = userMeetId
                ? `/meet/${meet.meeting_code}/summary?userMeetId=${userMeetId}`
                : `/meet/${meet.meeting_code}/summary`;
            router.push(summaryUrl);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center bg-gray-100 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-[400px] h-[750px] bg-gray-900 rounded-[3rem] overflow-hidden shadow-2xl border-[10px] border-gray-800 flex flex-col ring-1 ring-white/10"
            >
                {/* WhatsApp Top Bar */}
                <div className="absolute top-0 left-0 right-0 p-6 pt-4 z-20 flex flex-col justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
                    <div className="w-full flex justify-between items-center">
                        <ArrowLeftIcon
                            className="text-white cursor-pointer hover:opacity-80"
                            size={32}
                            onClick={handleBackClick}
                        />
                        <div className="flex items-center gap-1.5 text-gray-300 text-[11px] bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            <Lock size={10} />
                            端到端加密
                            {meet.status && (
                                <span
                                    className={`text-[11px] bg-gray-500 px-1 rounded-full backdrop-blur-sm font-medium ${isEnded ? 'text-red-400' : 'text-gray-300'
                                        }`}
                                >
                                    {getStatusText(isUserEnded ? 'ended' : meet.status)}
                                </span>
                            )}
                        </div>
                        {!isEnded ? (
                            <span className="text-gray-200 text-[12px] font-medium drop-shadow-md">
                                {formatTime(time)}
                            </span>
                        ) : (
                            <div className="w-16" />
                        )}
                    </div>

                    <div className="w-full flex flex-col items-center justify-center">
                        <h2 className="text-white text-xl font-semibold tracking-wide drop-shadow-md">
                            {meet.title || 'AI会议'}
                        </h2>

                        {!isEnded && (
                            <div className="relative z-10 mt-2">
                                <StatusIndicator status={indicatorStatus} />
                            </div>
                        )}
                    </div>
                    <div className="w-8" />
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-[#111b21] relative flex flex-col items-center justify-center overflow-hidden">
                    <div
                        className="absolute inset-0 opacity-5"
                        style={{
                            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                        }}
                    />

                    {/* AI Avatar */}
                    <div className="absolute top-[24%] left-1/2 transform -translate-x-1/2 z-10 scale-110">
                        <AIAvatar isSpeaking={rtcStatus === 'speaking' && !isEnded} />
                        {isEnded && (
                            <div className="relative z-10 mt-4 flex items-center justify-center">
                                <span className="text-red-400 text-sm font-medium">会议已结束</span>
                            </div>
                        )}
                    </div>

                    {/* Conversations list */}
                    {!isEnded && hasLiveContent && (
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-sm px-4">
                            <div className="bg-black/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 shadow-lg">
                                <div className="max-h-[200px] overflow-y-auto pr-1 space-y-3">
                                    {conversations.map((conv) => (
                                        <div key={conv.id} className="space-y-2">
                                            {/* Student (right) */}
                                            {conv.user_message_text ? (
                                                <div className="flex justify-end">
                                                    <div className="max-w-[75%]">
                                                        <div className="text-[10px] text-gray-300 mb-1 text-right">
                                                            {formatClock(conv.user_sent_at)}  你
                                                        </div>
                                                        <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-white text-sm whitespace-pre-wrap">
                                                            {conv.user_message_text}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {/* AI Teacher (left) */}
                                            {conv.ai_response_text ? (
                                                <div className="flex justify-start">
                                                    <div className="max-w-[75%]">
                                                        <div className="text-[10px] text-gray-300 mb-1">
                                                            AI {formatClock(conv.ai_responded_at)}
                                                        </div>
                                                        <div className="bg-teal-500/15 border border-teal-400/20 rounded-xl px-3 py-2 text-white text-sm whitespace-pre-wrap">
                                                            {conv.ai_response_text}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}

                                    {/* Streaming student draft */}
                                    {studentDraftLive ? (
                                        <div className="flex justify-end">
                                            <div className="max-w-[75%]">
                                                <div className="text-[10px] text-gray-300 mb-1 text-right">
                                                    {formatClock(studentDraftTimeIso)} 你
                                                </div>
                                                <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-white text-sm whitespace-pre-wrap">
                                                    {studentDraftLive}
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Streaming AI draft */}
                                    {teacherDraftLive ? (
                                        <div className="flex justify-start">
                                            <div className="max-w-[75%]">
                                                <div className="text-[10px] text-gray-300 mb-1">
                                                    AI {formatClock(teacherDraftTimeIso)}
                                                </div>
                                                <div className="bg-teal-500/15 border border-teal-400/20 rounded-xl px-3 py-2 text-white text-sm whitespace-pre-wrap">
                                                    {teacherDraftLive}
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* scroll anchor */}
                                    <div ref={bottomRef} />
                                </div>

                                {/* Realtime teacher audio playback control */}
                                {/* {teacherAudioStream ? (
                                    <div className="mt-3">
                                        <audio ref={audioRef} controls preload="none" className="w-full" />
                                    </div>
                                ) : null} */}
                            </div>
                        </div>
                    )}

                    {isEnded && hasLiveContent && (
                        <div className="absolute top-[38%] left-1/2 transform -translate-x-1/2 z-10 w-full max-w-sm px-4">
                            <div className="bg-black/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 shadow-lg">
                                <div className="text-[10px] text-gray-400 mb-2">对话记录</div>
                                <div className="max-h-[260px] overflow-y-auto pr-1 space-y-3">
                                    {conversations.map((conv) => (
                                        <div key={conv.id} className="space-y-2">
                                            <div className="flex justify-end">
                                                <div className="max-w-[75%]">
                                                    <div className="text-[10px] text-gray-300 mb-1 text-right">
                                                        {formatClock(conv.user_sent_at)} 你
                                                    </div>
                                                    <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-white text-sm whitespace-pre-wrap">
                                                        {conv.user_message_text}
                                                    </div>
                                                </div>
                                            </div>
                                            {conv.ai_response_text ? (
                                                <div className="flex justify-start">
                                                    <div className="max-w-[75%]">
                                                        <div className="text-[10px] text-gray-300 mb-1">
                                                            AI {formatClock(conv.ai_responded_at)}
                                                        </div>
                                                        <div className="bg-teal-500/15 border border-teal-400/20 rounded-xl px-3 py-2 text-white text-sm whitespace-pre-wrap">
                                                            {conv.ai_response_text}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}

                                    <div ref={bottomRef} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* WhatsApp Bottom Controls */}
                <div className="bg-[#111b21] px-6 pb-6 pt-6">
                    <div className="w-full flex justify-center mb-6">
                        <div className="w-10 h-1.5 bg-gray-600 rounded-full opacity-50" />
                    </div>
                    <div className="flex items-center justify-around px-6 bg-[#1f2c34] rounded-full py-4 shadow-lg border border-white/5">
                        {/* <button
                            className="text-gray-400 hover:text-white transition-colors p-1"
                            onClick={handleGoToSummary}
                        >
                            <MoreVertical size={26} />
                        </button> */}
                        <div className="w-14" />
                        <button
                            onClick={isRecording ? onStopRecording : onStartRecording}
                            disabled={isEnded || (rtcStatus !== 'idle' && !isRecording)}
                            className={`
                                w-16 h-16 rounded-full flex items-center justify-center
                                transition-all duration-300 shadow-lg
                                ${isEnded
                                    ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                                    : isRecording
                                        ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
                                        : 'bg-indigo-600 hover:bg-indigo-700 scale-100'
                                }
                                ${rtcStatus !== 'idle' && !isRecording && !isEnded ? 'opacity-50 cursor-not-allowed' : ''}
                                ${!isEnded ? 'cursor-pointer active:scale-95' : ''}
                            `}
                        >
                            {isRecording ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
                        </button>

                        {onEndMeeting && !isEnded ? (
                            <button
                                onClick={onEndMeeting}
                                className={`w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform hover:bg-red-600 ${rtcStatus === 'listening' || rtcStatus === 'connecting' || rtcStatus === 'speaking' ? 'opacity-50 bg-gray-600 cursor-not-allowed' : ''
                                    }`}
                                disabled={rtcStatus === 'listening' || rtcStatus === 'connecting' || rtcStatus === 'speaking'}
                            >
                                <Phone size={28} className="fill-current rotate-[135deg]" />
                            </button>
                        ) : (
                            <div className="w-14" />
                        )}
                    </div>
                </div>

                {/* Keep close button slot for layout consistency (optional) */}
                {!isEnded ? null : <button className="hidden" type="button" aria-hidden="true"><X /></button>}
            </motion.div>
            <ExitConfirmModal
                isOpen={showExitModal}
                onConfirm={handleConfirmExit}
                onCancel={() => setShowExitModal(false)}
            />
        </div>
    );
};

