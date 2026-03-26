
'use client';

import type { MyUserMeet } from '@/types/meet';
import { formatDateTime, formatMeetingCode, getStatusColor, getStatusLabel } from '@/utils/meet-helpers';
import { CheckCircle, Clock, MessageSquare, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function MeetListItem({ userMeet }: { userMeet: MyUserMeet }) {
    const router = useRouter();
    const code = userMeet.meet?.meeting_code || '';
    const formattedCode = formatMeetingCode(code);
    const isCompleted = userMeet.status === 'completed';
    const isInProgress = userMeet.status === 'in_progress';
    const isCancelled = userMeet.status === 'cancelled';

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="text-sm sm:text-base font-semibold text-gray-900">
                        {userMeet.meet?.title || '未命名会议'}
                    </h2>
                    <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            userMeet.status
                        )}`}
                    >
                        {userMeet.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {userMeet.status === 'cancelled' && <XCircle className="w-3 h-3 mr-1" />}
                        {getStatusLabel(userMeet.status)}
                    </span>
                </div>
                {formattedCode && (
                    <p className="text-xs text-gray-500 mb-2">
                        会议号：<span className="font-mono tracking-wider">{formattedCode}</span>
                    </p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        加入时间：{formatDateTime(userMeet.joined_at)}
                    </span>
                    {userMeet.completed_at && (
                        <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            完成时间：{formatDateTime(userMeet.completed_at)}
                        </span>
                    )}
                </div>
            </div>

            <div className="ml-auto flex flex-col sm:flex-row gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                {isInProgress && userMeet.meet && (
                    <button
                        onClick={() => router.push(`/meet/${userMeet?.meet?.meeting_code}`)}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 w-full sm:w-auto"
                    >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        继续对话
                    </button>
                )}
                {isCompleted && userMeet.meet && (
                    <button
                        onClick={() =>
                            router.push(
                                `/meet/${userMeet?.meet?.meeting_code}/summary?userMeetId=${userMeet.id}`
                            )
                        }
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 w-full sm:w-auto"
                    >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        查看结果
                    </button>
                )}
                {isCancelled && userMeet.meet && (
                    <button
                        onClick={() => router.push(`/meet/${userMeet?.meet?.meeting_code}`)}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-300 w-full sm:w-auto"
                    >
                        重新进入
                    </button>
                )}
            </div>
        </div>
    );
}
