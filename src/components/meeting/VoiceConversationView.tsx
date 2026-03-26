'use client';

import type { Conversation, Meet } from '@/types/meeting';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, Lock, Mic, MicOff, MoreVertical, Phone, Send, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AIAvatar } from './AIAvatar';
import { StatusIndicator } from './StatusIndicator';

interface VoiceConversationViewProps {
    meet: Meet;
    conversations: Conversation[];
    status: 'idle' | 'recording' | 'transcribing' | 'processing' | 'speaking' | 'listening';
    isRecording: boolean;
    /** 当前用户在该会议下的 user_meets.status（in_progress/completed/cancelled/...） */
    userMeetStatus?: string | null;
    /** 当前用户在该会议下的 user_meets.id，用于精确查看个人结果 */
    userMeetId?: string | null;
    transcriptLive?: string; // 实时转写字幕（仅阿里云 ASR 方案有效）
    isListening?: boolean; // 是否在监听状态（仅阿里云 ASR 方案有效）
    onStartRecording: () => void;
    onStopRecording: () => void;
    /** 发送当前转写并触发 AI 回复（仅阿里云 ASR 方案，与取消/发送按钮配合） */
    onSendTranscript?: () => void;
    onEndMeeting?: () => void;
    /** 是否显示「发送」按钮（由全局/配置 NEXT_PUBLIC_ALIYUN_ASR_SEND_BUTTON_ENABLED 等控制） */
    sendButtonEnabled?: boolean;
    /** 是否显示「取消」按钮 */
    cancelButtonEnabled?: boolean;
    /** 是否已开启静音自动提交（用于展示提示文案） */
    silenceAutoCommitEnabled?: boolean;
    /** 静音稳定窗口（毫秒），用于提示文案 */
    silenceStableMs?: number;
}

export const VoiceConversationView = ({
    meet,
    conversations,
    status,
    isRecording,
    userMeetStatus,
    userMeetId,
    transcriptLive,
    isListening,
    onStartRecording,
    onStopRecording,
    onSendTranscript,
    onEndMeeting,
    sendButtonEnabled = true,
    cancelButtonEnabled = true,
    silenceAutoCommitEnabled = false,
    silenceStableMs = 1600,
}: VoiceConversationViewProps) => {
    const [time, setTime] = useState(0);
    const router = useRouter();
    // 优先使用用户会议实例状态，其次回退到全局会议状态
    const isUserEnded = userMeetStatus === 'completed' || userMeetStatus === 'cancelled';
    const isMeetEnded = meet.status === 'ended' || meet.status === 'cancelled';
    const isEnded = isUserEnded || isMeetEnded;

    // 只有未结束的会议才启动计时器
    useEffect(() => {
        if (!isEnded) {
            const timer = setInterval(() => setTime(t => t + 1), 1000);
            return () => clearInterval(timer);
        }
    }, [isEnded]);

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

    // 处理左侧返回按钮点击
    const handleBackClick = () => {
        if (isEnded) {
            // 已结束的会议跳转到summary页面（按用户会议实例）
            const summaryUrl = userMeetId
                ? `/meet/${meet.meeting_code}/summary?userMeetId=${userMeetId}`
                : `/meet/${meet.meeting_code}/summary`;
            router.push(summaryUrl);
        } else {
            // 未结束的会议返回上一页
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
        <div className="flex flex-col items-center justify-center  bg-gray-100 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-[400px] h-[750px] bg-gray-900 rounded-[3rem] overflow-hidden shadow-2xl border-[10px] border-gray-800 flex flex-col ring-1 ring-white/10"
            >
                {/* WhatsApp Top Bar */}
                <div className="absolute top-0 left-0 right-0 p-6 pt-4 z-20 flex flex-col justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
                    <div className='w-full flex justify-between items-center'>
                        <ArrowLeftIcon
                            className="text-white cursor-pointer hover:opacity-80"
                            size={32}
                            onClick={handleBackClick}
                        />
                        <div className="flex items-center gap-1.5 text-gray-300 text-[11px]  bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                            <Lock size={10} /> 端到端加密

                            {meet.status && (
                                <span className={`text-[11px] bg-gray-500 px-1  rounded-full backdrop-blur-sm font-medium ${isEnded ? 'text-red-400' : 'text-gray-300'
                                    }`}>
                                    {getStatusText(isUserEnded ? 'ended' : meet.status)}
                                </span>
                            )}
                        </div>
                        {!isEnded && (
                            <span className="text-gray-200 text-[12px] font-medium drop-shadow-md">
                                {formatTime(time)}
                            </span>
                        )}
                        {isEnded && <div className="w-16" />} {/* 占位符保持居中 */}
                    </div>

                    <div className="w-full flex flex-col items-center justify-center">
                        <h2 className="text-white text-2xl font-semibold tracking-wide drop-shadow-md">
                            {meet.title || 'AI会议'}
                        </h2>

                        {!isEnded && (
                            <div className="relative z-10">
                                <StatusIndicator status={status} />
                            </div>
                        )}
                    </div>
                    <div className="w-8" /> {/* 占位符保持居中 */}
                </div>

                {/* Main Content: AI Avatar and Conversations */}
                <div className="flex-1 bg-[#111b21] relative flex flex-col items-center justify-center overflow-hidden">
                    {/* Background Pattern */}
                    <div
                        className="absolute inset-0 opacity-5"
                        style={{
                            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                        }}
                    />

                    {/* AI Avatar */}
                    <div className="absolute top-[24%] left-1/2 transform -translate-x-1/2 z-10 scale-110">
                        <AIAvatar isSpeaking={status === 'speaking' && !isEnded} />
                        {/* Status Indicator - 已结束的会议不显示等待中状态 */}

                        {isEnded && (
                            <div className="relative z-10 mt-4">
                                <span className="text-red-400 text-sm font-medium">会议已结束</span>
                            </div>
                        )}
                    </div>



                    {/* 实时转写字幕（阿里云 ASR：监听/录音时显示已说内容，可取消或发送） */}
                    {!isEnded && transcriptLive && (status === 'listening' || status === 'recording') && (
                        <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-sm px-4">
                            <div className="bg-black/40 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 shadow-lg">
                                <div className="text-xs text-gray-400 mb-1.5">您说的内容</div>
                                <div className="text-white text-sm leading-relaxed min-h-10 max-h-24 overflow-y-auto">
                                    {transcriptLive}
                                </div>
                                {silenceAutoCommitEnabled && (
                                    <p className="text-[10px] text-gray-500 mt-1.5">
                                        静音自动发送已开启：约 {Math.round(silenceStableMs / 100) / 10} 秒无新字幕后将自动提交
                                        {sendButtonEnabled ? '，也可点 Send。' : '。'}
                                    </p>
                                )}
                                {onSendTranscript && (sendButtonEnabled || cancelButtonEnabled) && (
                                    <div className="flex gap-2 mt-3">
                                        {cancelButtonEnabled && (
                                            <button
                                                type="button"
                                                onClick={onStopRecording}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm border border-white/20"
                                            >
                                                <X className="w-4 h-4" />
                                                Cancel
                                            </button>
                                        )}
                                        {sendButtonEnabled && (
                                            <button
                                                type="button"
                                                onClick={onSendTranscript}
                                                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium ${cancelButtonEnabled ? 'flex-1' : 'w-full'}`}
                                            >
                                                <Send className="w-4 h-4" />
                                                Send
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Conversation History - 只显示最后一次对话；正在显示「您说的内容」时隐藏，AI 回复后再显示 */}
                    {conversations.length > 0 &&
                        !(transcriptLive && (status === 'listening' || status === 'recording')) &&
                        (() => {
                            const lastConversation = conversations[conversations.length - 1];
                            return (
                                <motion.div
                                    key={lastConversation.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10 mt-6 w-full max-w-sm px-4"
                                >
                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-white/5">
                                        <div className="text-xs text-gray-400 mb-2">
                                            {new Date(lastConversation.user_sent_at).toLocaleTimeString()}
                                        </div>
                                        <div className="text-sm text-white/90 mb-2">
                                            <span className="font-semibold">您：</span>
                                            {lastConversation.user_message_text}
                                        </div>
                                        <div className="text-sm text-teal-300">
                                            <span className="font-semibold">AI：</span>
                                            {lastConversation.ai_response_text}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()}
                </div>

                {/* WhatsApp Bottom Controls */}
                <div className="bg-[#111b21] px-6 pb-6 pt-6">
                    {/* Swipe Up Indicator */}
                    <div className="w-full flex justify-center mb-6">
                        <div className="w-10 h-1.5 bg-gray-600 rounded-full opacity-50"></div>
                    </div>
                    <div className="flex items-center justify-between px-6 bg-[#1f2c34] rounded-full py-4 shadow-lg border border-white/5">
                        <button className="text-gray-400 hover:text-white transition-colors p-1"
                            onClick={handleGoToSummary}
                        >
                            <MoreVertical size={26} />
                        </button>

                        {/* 录音按钮 - 居中，更大 */}
                        <button
                            onClick={isRecording ? onStopRecording : onStartRecording}
                            disabled={isEnded || (status !== 'idle' && !isRecording)}
                            className={`
                                w-16 h-16 rounded-full flex items-center justify-center
                                transition-all duration-300 shadow-lg
                                ${isEnded
                                    ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                                    : isRecording
                                        ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
                                        : 'bg-indigo-600 hover:bg-indigo-700 scale-100'
                                }
                                ${status !== 'idle' && !isRecording && !isEnded ? 'opacity-50 cursor-not-allowed' : ''}
                                ${!isEnded ? 'cursor-pointer active:scale-95' : ''}
                            `}
                        >
                            {isRecording ? (
                                <MicOff className="w-8 h-8 text-white" />
                            ) : (
                                <Mic className="w-8 h-8 text-white" />
                            )}
                        </button>

                        {/* 挂断按钮 - 已结束的会议不显示 */}
                        {onEndMeeting && !isEnded && (
                            <button
                                onClick={onEndMeeting}
                                className={`w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform hover:bg-red-600 ${status === 'listening' || status === 'recording' || status === 'speaking' ? 'opacity-50 bg-gray-600 cursor-not-allowed' : ''}    `}
                                disabled={(status === 'listening' || status === 'recording' || status === 'speaking')}
                            >
                                <Phone size={28} className="fill-current rotate-[135deg]" />
                            </button>
                        )}
                        {isEnded && <div className="w-14" />} {/* 占位符保持居中 */}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
