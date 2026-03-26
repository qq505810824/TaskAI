
'use client';

import { MyUserMeet } from '@/types/meet';
import { ChevronLeft, ChevronRight, ExternalLink, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { OverviewStatusBadge } from '../common/OverviewStatusBadge';

interface AllUserMeetsListProps {
    meets: MyUserMeet[];
    isLoading?: boolean;
    pagination: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
    onPageChange: (page: number) => void;
}

export const AllUserMeetsList = ({ meets, isLoading, pagination, onPageChange }: AllUserMeetsListProps) => {
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-[600px] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                <h2 className="text-xl font-bold text-gray-900">用户会议动态</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                    共 <span className="text-indigo-600">{pagination.total}</span> 条记录
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">用户</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">会议详情</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">加入时间</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">完成时间</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">状态</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {meets.length > 0 ? (
                            meets.map((session) => (
                                <tr key={session.id} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center overflow-hidden border border-indigo-100 shrink-0">
                                                {(session as any).user?.avatar_url ? (
                                                    <img src={(session as any).user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={18} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-gray-900 truncate">{(session as any).user?.name || '匿名用户'}</div>
                                                <div className="text-[11px] text-gray-400 truncate">{(session as any).user?.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium text-gray-700 truncate">{session.meet?.title || '未命名会议'}</div>
                                            <div className="text-[11px] font-mono text-gray-400 tracking-wider">{session.meet?.meeting_code}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-600 font-medium">
                                            {new Date(session.joined_at).toLocaleString('zh-CN', {
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {session.status == 'completed' && session.completed_at && (
                                            <div className="text-sm text-gray-600 font-medium">
                                                {new Date(session.completed_at).toLocaleString('zh-CN', {
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <OverviewStatusBadge status={session.status} />
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        {session.status == 'completed' && (
                                            <button
                                                onClick={() => router.push(`/meet/${session.meet?.meeting_code}/summary?userMeetId=${session.id}`)}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
                                            >
                                                查看记录
                                                <ExternalLink size={12} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <User size={32} className="opacity-20" />
                                        </div>
                                        <p className="text-base font-medium">暂无员工会议动态</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-500">
                        第 <span className="text-gray-900">{pagination.page}</span> / {pagination.totalPages} 页
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex items-center gap-1 px-1">
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                // Simple sliding window for pagination numbers
                                let pageNum = i + 1;
                                if (pagination.totalPages > 5) {
                                    if (pagination.page > 3) {
                                        pageNum = pagination.page - 3 + i;
                                    }
                                    if (pageNum + (4 - i) > pagination.totalPages) {
                                        pageNum = pagination.totalPages - 4 + i;
                                    }
                                }
                                if (pageNum <= 0 || pageNum > pagination.totalPages) return null;

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => onPageChange(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${pagination.page === pageNum
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => onPageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
