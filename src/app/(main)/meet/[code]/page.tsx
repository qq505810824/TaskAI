'use client';

import { EndMeetingModal } from '@/components/meeting/EndMeetingModal';
import { ProcessingView } from '@/components/meeting/ProcessingView';
import { RtcVoiceConversationView } from '@/components/meeting/RtcVoiceConversationView';
import { useAuth } from '@/contexts/AuthContext';
import { useMeets } from '@/hooks/useMeets';
import { useRtcTutorSession } from '@/hooks/useRtcTutorSession';
import { useUser } from '@/hooks/useUser';
import { supabase } from '@/lib/supabase';
import type { Meet } from '@/types/meeting';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MeetRtcPage() {
    const params = useParams();
    const router = useRouter();
    const meetingCode = params.code as string;

    const { getMeetByCode, getMeetById } = useMeets();
    const { identifyUser, getCurrentUser } = useUser();
    const { user: authUser } = useAuth();

    const [meet, setMeet] = useState<Meet | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showEndMeetingModal, setShowEndMeetingModal] = useState(false);


    // 从 URL 参数获取平台信息并识别用户（与普通 ASR 页面保持一致）
    useEffect(() => {
        const identifyPlatformUser = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const platform = urlParams.get('platform') as 'telegram' | 'whatsapp' | 'web' | null;
            const platformUserId = urlParams.get('userId');

            if (platform === 'web' || !platform || !platformUserId) {
                try {
                    const {
                        data: { session },
                    } = await supabase.auth.getSession();

                    if (session?.user && session.access_token) {
                        const currentUser = await getCurrentUser(session.access_token);
                        if (currentUser) {
                            setUserId(currentUser.id);
                            return;
                        }
                    }

                    setUserId(authUser?.id || '');
                    return;
                } catch (err) {
                    console.error('Failed to get current user:', err);
                    setError('请先登录');
                }
            } else if (platform === 'telegram' || platform === 'whatsapp') {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meetingCode]);

    const loadMeet = async () => {
        try {
            const meetData = await getMeetByCode(meetingCode);
            if (!meetData) {
                setError('会议不存在或已结束');
                return;
            }

            const fullMeet = await getMeetById(meetData.id);
            if (fullMeet) {
                setMeet(fullMeet);
            } else {
                setMeet({
                    id: meetData.id,
                    meeting_code: meetData.meetingCode,
                    title: meetData.title || '会议',
                    description: null,
                    host_id: '',
                    start_time: null,
                    duration: null,
                    status: meetData.status as Meet['status'],
                    join_url: meetData.joinUrl,
                    created_at: '',
                    updated_at: '',
                    ended_at: null,
                });
            }
        } catch (err) {
            setError('会议不存在或已结束');
            console.error('Failed to load meet:', err);
        }
    };

    const handleEndMeeting = () => {
        setShowEndMeetingModal(true);
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

    if (error) {
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

    if (!meet) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">加载会议中...</p>
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

    if (isProcessing) {
        return <ProcessingView />;
    }

    return (
        <RtcVoiceConversationContainer
            meet={meet}
            userId={userId}
            onEndMeeting={handleEndMeeting}
            showEndMeetingModal={showEndMeetingModal}
            onCancelEndMeeting={handleCancelEndMeeting}
            onProcessingStart={() => setIsProcessing(true)}
            onProcessingComplete={handleProcessingComplete}
        />
    );
}

function RtcVoiceConversationContainer({
    meet,
    userId,
    onEndMeeting,
    showEndMeetingModal,
    onCancelEndMeeting,
    onProcessingStart,
    onProcessingComplete,
}: {
    meet: Meet;
    userId: string;
    onEndMeeting: () => void;
    showEndMeetingModal: boolean;
    onCancelEndMeeting: () => void;
    onProcessingStart: () => void;
    onProcessingComplete: (userMeetId?: string) => void;
}) {
    const router = useRouter();
    const {
        conversations,
        rtcStatus,
        isRtcActive,
        userMeetId,
        userMeetStatus,
        teacherDraft,
        studentDraftLive,
        teacherAudioStream,
        resetConversation,
        startRtcSession,
        stopRtcSession,
        getConversationsSnapshot,
    } = useRtcTutorSession(meet, userId);

    const handleConfirmEndMeetingWithReset = async () => {
        // 先停止 RTC，尽量触发 MediaRecorder.onstop，把 ai_audio_url 写入 conversations
        await stopRtcSession();

        const conversationsSnapshot = getConversationsSnapshot();

        console.log('=== 会议对话记录（RTC 模式，本地） ===');
        console.log(`会议ID: ${meet.id}`);
        console.log(`会议标题: ${meet.title}`);
        console.log(conversationsSnapshot);

        onProcessingStart();

        try {
            if (conversationsSnapshot.length > 0) {
                const saveConvResponse = await fetch('/api/conversations/batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        conversations: conversationsSnapshot.map(({ ai_audio_url: _aiAudioUrl, ...rest }) => ({
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
            }

            resetConversation();
            onProcessingComplete(userMeetId ?? undefined);
        } catch (err) {
            console.error('Failed to end meeting (RTC):', err);
            onProcessingComplete(userMeetId ?? undefined);
        }
    };

    const handleExitConfirm = async () => {
        // 停止 RTC
        await stopRtcSession();
        // 清除对话内容（resetConversation 会停止 RTC 并清空状态）
        await resetConversation();
        // 返回上一页
        router.back();
    };

    return (
        <>
            <RtcVoiceConversationView
                meet={meet}
                conversations={conversations}
                rtcStatus={rtcStatus}
                isRecording={isRtcActive}
                userMeetId={userMeetId}
                userMeetStatus={userMeetStatus}
                teacherDraftLive={teacherDraft}
                studentDraftLive={studentDraftLive}
                teacherAudioStream={teacherAudioStream}
                onStartRecording={startRtcSession}
                onStopRecording={stopRtcSession}
                onEndMeeting={onEndMeeting}
                onExitConfirm={handleExitConfirm}
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

