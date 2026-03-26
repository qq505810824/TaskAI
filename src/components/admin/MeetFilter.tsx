'use client';

import type { MeetFilter as MeetFilterType } from '@/hooks/useAdminMeets';
import { X } from 'lucide-react';

interface MeetFilterProps {
    filter: MeetFilterType;
    onFilterChange: (filter: MeetFilterType) => void;
    onClear: () => void;
}

export const MeetFilter = ({ filter, onFilterChange, onClear }: MeetFilterProps) => {
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value.trim();
        onFilterChange({ ...filter, title: title || undefined });
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const status = e.target.value;
        onFilterChange({ ...filter, status: status || undefined });
    };

    const hasActiveFilter = filter.title || filter.status;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
                {/* 标题筛选 */}
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        value={filter.title || ''}
                        onChange={handleTitleChange}
                        placeholder="输入会议标题关键词..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {/* 状态筛选 */}
                {/* <div className="min-w-[150px]">
                    <select
                        value={filter.status || ''}
                        onChange={handleStatusChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">全部状态</option>
                        <option value="pending">待开始</option>
                        <option value="ongoing">进行中</option>
                        <option value="ended">已结束</option>
                        <option value="cancelled">已取消</option>
                    </select>
                </div> */}

                {/* 清除筛选按钮 */}
                {hasActiveFilter && (
                    <div className="flex items-end">
                        <button
                            onClick={onClear}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* 筛选图标 */}
                {/* {!hasActiveFilter && (
                    <div className="flex items-end">
                        <div className="px-4 py-2 text-gray-400">
                            <Filter className="w-5 h-5" />
                        </div>
                    </div>
                )} */}
            </div>
        </div>
    );
};
