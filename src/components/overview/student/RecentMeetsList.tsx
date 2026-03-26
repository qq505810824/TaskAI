
'use client';

import { MyUserMeet } from '@/types/meet';
import { ArrowRight, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { OverviewStatusBadge } from '../common/OverviewStatusBadge';

interface RecentMeetsListProps {
    meets: MyUserMeet[];
    isLoading?: boolean;
}

export const RecentMeetsList = ({ meets, isLoading }: RecentMeetsListProps) => {
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-[500px] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <h2 className="text-xl font-bold text-gray-900">最近会议</h2>
                <button
                    onClick={() => router.push('/my/meets')}
                    className="text-indigo-600 text-sm font-semibold hover:text-indigo-700 flex items-center gap-1 group"
                >
                    查看全部 <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>

            <div className="divide-y divide-gray-100 overflow-y-auto flex-1 p-2">
                {meets.length > 0 ? (
                    meets.map((session) => (
                        <div key={session.id} className="p-4 hover:bg-gray-50 transition-colors rounded-xl mx-2 my-1 group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                        {session.meet?.title?.substring(0, 2).toUpperCase() || 'AI'}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{session.meet?.title || '未命名会议'}</h3>
                                        <p className="text-xs text-gray-500 font-medium">
                                            {new Date(session.joined_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <OverviewStatusBadge status={session.status} />
                            </div>
                            <div className="flex items-center justify-between mt-2 pl-14">
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                    {session.meet?.meeting_code}
                                </span>
                                {session.status === 'in_progress' ? (
                                    <button
                                        onClick={() => router.push(`/meet/${session.meet?.meeting_code}`)}
                                        className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm font-semibold"
                                    >
                                        <Video size={14} /> 继续会议
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => router.push(`/meet/${session.meet?.meeting_code}/summary?userMeetId=${session.id}`)}
                                        className="text-xs text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg font-semibold transition-colors"
                                    >
                                        查看回顾
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Video size={32} className="opacity-20" />
                        </div>
                        <p className="text-base font-medium">暂无会议记录</p>
                        <button
                            onClick={() => router.push('/')}
                            className="mt-4 text-sm text-indigo-600 font-semibold"
                        >
                            去加入会议
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
