'use client';

import { EndMeetingModal } from '@/components/meeting/EndMeetingModal';
import { ProcessingView } from '@/components/meeting/ProcessingView';
import { VoiceConversationView } from '@/components/meeting/VoiceConversationView';
import { useAuth } from '@/contexts/AuthContext';
import { useMeets } from '@/hooks/useMeets';
import { useUser } from '@/hooks/useUser';
import { useVoiceConversation } from '@/hooks/useVoiceConversation';
import { supabase } from '@/lib/supabase';
import type { Meet } from '@/types/meeting';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MeetPage() {
    const params = useParams();
    const router = useRouter();
    const meetingCode = params.code as string;

    const { getMeetByCode, getMeetById, updateMeetStatus, loading: meetLoading } = useMeets();
    const { identifyUser, getCurrentUser } = useUser();
    const { user: authUser } = useAuth();
    const [meet, setMeet] = useState<Meet | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showEndMeetingModal, setShowEndMeetingModal] = useState(false);


    // 从URL参数获取平台信息并识别用户
    useEffect(() => {
        const identifyPlatformUser = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const platform = urlParams.get('platform') as 'telegram' | 'whatsapp' | 'web' | null;
            const platformUserId = urlParams.get('userId');

            // 如果是 web 平台或没有 platform 参数，使用 Supabase Auth 的当前登录用户
            if (platform === 'web' || !platform || !platformUserId) {
                try {
                    // 获取当前 Supabase Auth session
                    const {
                        data: { session },
                    } = await supabase.auth.getSession();

                    if (session?.user && session.access_token) {
                        // 使用 token 获取当前用户信息
                        const currentUser = await getCurrentUser(session.access_token);
                        if (currentUser) {
                            setUserId(currentUser.id);
                            return;
                        }
                    } else {
                        setUserId(authUser?.id || '');
                        return;
                    }

                    // 如果没有登录，显示错误
                    setError('请先登录');
                } catch (err) {
                    console.error('Failed to get current user:', err);
                    setError('请先登录');
                }
            } else if (platform === 'telegram' || platform === 'whatsapp') {
                // 如果是 telegram 或 whatsapp 平台，通过 identify API 识别或创建用户
                try {
                    const user = await identifyUser({
                        platform,
                        platformUserId,
                        platformUsername: urlParams.get('username') || undefined,
                        platformDisplayName: urlParams.get('displayName') || undefined,
                    });

                    if (user) {
                        setUserId(user.id);
                    }
                } catch (err) {
                    console.error('Failed to identify user:', err);
                    setError('用户识别失败');
                }
            }
        };

        identifyPlatformUser();
    }, [identifyUser, getCurrentUser, authUser]);

    // 加载会议信息
    useEffect(() => {
        if (meetingCode) {

            loadMeet();
        }
    }, [meetingCode]);

    const loadMeet = async () => {
        try {
            const meetData = await getMeetByCode(meetingCode);
            if (meetData) {
                // 获取完整会议信息
                const fullMeet = await getMeetById(meetData.id);
                if (fullMeet) {
                    setMeet(fullMeet);
                } else {
                    // 如果获取不到完整信息，使用基本信息
                    setMeet({
                        id: meetData.id,
                        meeting_code: meetData.meetingCode,
                        title: meetData.title || '会议',
                        description: null,
                        host_id: '',
                        start_time: null,
                        duration: null,
                        status: meetData.status as any,
                        join_url: meetData.joinUrl,
                        created_at: '',
                        updated_at: '',
                        ended_at: null,
                    });
                }
            }
        } catch (err) {
            setError('会议不存在或已结束');
            console.error('Failed to load meet:', err);
        }
    };

    const handleEndMeeting = () => {
        // 显示结束会议 modal
        setShowEndMeetingModal(true);
    };

    const handleConfirmEndMeeting = async () => {
        setShowEndMeetingModal(false);
        if (meet && userId) {
            setIsProcessing(true);
            try {
                // 1. 保存对话记录到 Supabase
                // 对话记录会通过 VoiceConversationContainer 传递过来
                // 这里先调用，实际保存会在 handleConfirmEndMeetingWithReset 中完成
            } catch (err) {
                console.error('Failed to end meeting:', err);
                setIsProcessing(false);
            }
        }
    };

    const handleCancelEndMeeting = () => {
        setShowEndMeetingModal(false);
    };

    const handleProcessingComplete = (userMeetId?: string) => {
        const suffix = userMeetId
            ? `?userMeetId=${encodeURIComponent(userMeetId)}`
            : '';
        router.push(`/meet/${meetingCode}/summary${suffix}`);
    };

    if (meetLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">加载中...</p>
                </div>
            </div>
        );
    }

    if (error || !meet) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error || '会议不存在'}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        返回首页
                    </button>
                </div>
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">正在初始化用户...</p>
                </div>
            </div>
        );
    }

    // 显示处理界面
    if (isProcessing) {
        return <ProcessingView />;
    }

    return (
        <VoiceConversationContainer
            meet={meet}
            userId={userId}
            onEndMeeting={handleEndMeeting}
            showEndMeetingModal={showEndMeetingModal}
            onConfirmEndMeeting={handleConfirmEndMeeting}
            onCancelEndMeeting={handleCancelEndMeeting}
            onProcessingStart={() => setIsProcessing(true)}
            onProcessingComplete={handleProcessingComplete}
        />
    );
}

function VoiceConversationContainer({
    meet,
    userId,
    onEndMeeting,
    showEndMeetingModal,
    onConfirmEndMeeting,
    onCancelEndMeeting,
    onProcessingStart,
    onProcessingComplete,
}: {
    meet: Meet;
    userId: string;
    onEndMeeting: () => void;
    showEndMeetingModal: boolean;
    onConfirmEndMeeting: () => void;
    onCancelEndMeeting: () => void;
    onProcessingStart: () => void;
    onProcessingComplete: (userMeetId?: string) => void;
}) {
    // 可以通过环境变量或配置来选择 ASR 方案，默认使用 'dify'
    // 设置为 'aliyun' 使用阿里云实时语音识别，'dify' 使用 Dify 转写
    const asrMode = (process.env.NEXT_PUBLIC_ASR_MODE as 'dify' | 'aliyun' | undefined) || 'dify';

    const {
        conversations,
        status,
        isRecording,
        userMeetId,
        userMeetStatus,
        transcriptLive,
        isListening,
        handleStartRecording,
        handleStopRecording,
        handleSendTranscript, // 发送当前转写并触发 AI 回复（仅阿里云 ASR 方案）
        resetConversation,
        aliyunInteraction,
    } = useVoiceConversation(meet, userId, { asrMode });

    // 确认结束会议时的处理
    const handleConfirmEndMeetingWithReset = async () => {
        // 打印所有对话记录
        console.log('=== 会议对话记录（本地） ===');
        console.log(`会议ID: ${meet.id}`);
        console.log(`会议标题: ${meet.title}`);
        console.log(`总对话数: ${conversations.length}`);
        console.log('对话详情:');
        conversations.forEach((conv, index) => {
            console.log(`\n[对话 ${index + 1}]`);
            console.log(`ID: ${conv.id}`);
            console.log(`用户发送时间: ${new Date(conv.user_sent_at).toLocaleString()}`);
            console.log(`用户消息: ${conv.user_message_text}`);
            console.log(`AI回复时间: ${new Date(conv.ai_responded_at).toLocaleString()}`);
            console.log(`AI回复: ${conv.ai_response_text}`);
            console.log(`用户音频时长: ${conv.user_audio_duration}秒`);
        });
        console.log('=== 对话记录结束 ===');

        // 开始处理流程
        onProcessingStart();

        try {
            // 1. 保存对话记录到 Supabase
            if (conversations.length > 0) {
                const saveConvResponse = await fetch('/api/conversations/batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        conversations: conversations.map(({ ai_audio_url: _aiAudioUrl, ...rest }) => ({
                            ...rest,
                            ai_audio_url: null,
                        })),
                    }),
                });

                if (!saveConvResponse.ok) {
                    const errorData = await saveConvResponse.json();
                    throw new Error(errorData.message || 'Failed to save conversations');
                }
            }

            // 2. 生成会议总结和任务列表（基于当前用户会议实例）
            const generateResponse = await fetch('/api/todos/generate-llm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ meetId: meet.id, userId, userMeetId }),
            });

            if (!generateResponse.ok) {
                const errorData = await generateResponse.json();
                console.warn('Failed to generate summary and todos:', errorData.message);
                // 不阻止流程继续，因为总结和任务可以后续手动生成
            }

            // 重置 conversation_id
            resetConversation();

            onProcessingComplete(userMeetId ?? undefined);
        } catch (error) {
            console.error('Failed to end meeting:', error);
            onProcessingComplete(userMeetId ?? undefined);
        }
    };

    return (
        <>
            <VoiceConversationView
                meet={meet}
                conversations={conversations}
                status={status}
                isRecording={isRecording}
                userMeetId={userMeetId}
                userMeetStatus={userMeetStatus}
                transcriptLive={transcriptLive}
                isListening={isListening}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                onSendTranscript={handleSendTranscript}
                onEndMeeting={onEndMeeting}
                sendButtonEnabled={asrMode === 'aliyun' ? aliyunInteraction.sendButtonEnabled : true}
                cancelButtonEnabled={asrMode === 'aliyun' ? aliyunInteraction.cancelButtonEnabled : true}
                silenceAutoCommitEnabled={
                    asrMode === 'aliyun' ? aliyunInteraction.silenceAutoCommitEnabled : false
                }
                silenceStableMs={aliyunInteraction.silenceStableMs}
            />
            <EndMeetingModal
                isOpen={showEndMeetingModal}
                conversations={conversations}
                onConfirm={handleConfirmEndMeetingWithReset}
                onCancel={onCancelEndMeeting}
            />
        </>
    );
}
