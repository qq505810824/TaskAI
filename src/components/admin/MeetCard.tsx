'use client';

import type { MeetWithHost } from '@/hooks/useAdminMeets';
import { Calendar, Check, Clock, Copy, Edit, ExternalLink, Trash2, User, Users } from 'lucide-react';
import moment from 'moment';
import Link from 'next/link';
import { useState } from 'react';

interface MeetCardProps {
    meet: MeetWithHost;
    onEdit: (meet: MeetWithHost) => void;
    onDelete: (meetId: string) => void;
    onCopy: (text: string, type: 'code' | 'url') => void;
    isDeleting?: boolean;
}

export const MeetCard = ({ meet, onEdit, onDelete, onCopy, isDeleting }: MeetCardProps) => {
    const [copiedType, setCopiedType] = useState<'code' | 'url' | null>(null);
    const getStatusColor = (status: string) => {
        const colorMap: Record<string, string> = {
            pending: 'bg-green-100 text-green-700',
            ongoing: 'bg-green-100 text-green-700',
            ended: 'bg-blue-100 text-blue-700',
            cancelled: 'bg-red-100 text-red-700',
        };
        return colorMap[status] || 'bg-gray-100 text-gray-700';
    };

    const getStatusText = (status: string) => {
        const statusMap: Record<string, string> = {
            pending: '进行中',
            ended: '已结束',
            cancelled: '已取消',
        };
        return statusMap[status] || status;
    };

    const isEnded = meet.status === 'ended';

    // 处理复制
    const handleCopy = async (text: string, type: 'code' | 'url') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedType(type);
            // 1.5秒后隐藏成功图标
            setTimeout(() => {
                setCopiedType(null);
            }, 1500);
            // 调用父组件的回调（如果需要）
            onCopy(text, type);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow flex flex-col">
            {/* 头部：标题和状态 */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{meet.title}</h3>
                </div>
                {/* <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${getStatusColor(meet.status)}`}>
                    {getStatusText(meet.status)}
                </span> */}
            </div>

            {/* 描述 */}
            {meet.description && <p className="text-sm text-gray-600 mb-4 line-clamp-2">{meet.description}</p>}

            {/* 会议信息 */}
            <div className="space-y-2 mb-4 flex-1">
                {/* 会议号 */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span className="font-mono">{meet.meeting_code}</span>
                    </div>
                    <button
                        onClick={() => handleCopy(meet.meeting_code, 'code')}
                        className="text-indigo-600 hover:text-indigo-700 transition-colors relative"
                        title="复制会议号"
                    >
                        {copiedType === 'code' ? (
                            <Check className="w-4 h-4 text-green-500" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* 会议链接 */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0 flex-1">
                        <ExternalLink className="w-4 h-4 shrink-0" />
                        <span className="truncate font-mono text-xs">{meet.join_url}</span>
                    </div>
                    <button
                        onClick={() => handleCopy(meet.join_url, 'url')}
                        className="text-indigo-600 hover:text-indigo-700 transition-colors ml-2 shrink-0 relative"
                        title="复制链接"
                    >
                        {copiedType === 'url' ? (
                            <Check className="w-4 h-4 text-green-500" />
                        ) : (
                            <Copy className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* 创建者 */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="w-4 h-4" />
                    <span>创建者: {meet.hostName}</span>
                </div>

                {/* 开始时间 */}
                {meet.start_time && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{moment(meet.start_time).format('YYYY-MM-DD HH:mm')}</span>
                    </div>
                )}

                {/* 预计时长 */}
                {meet.duration && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        <span>预计 {meet.duration} 分钟</span>
                    </div>
                )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <Link
                    href={`/meet/${meet.meeting_code}`}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                    <ExternalLink className="w-4 h-4" />
                    进入会议
                </Link>

                {/* 编辑按钮 - 已结束的会议不显示 */}

                <button
                    onClick={() => onEdit(meet)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="编辑会议"
                >
                    <Edit className="w-4 h-4" />
                </button>

                {/* 删除按钮 - 已结束的会议不显示 */}

                <button
                    onClick={() => onDelete(meet.id)}
                    disabled={isDeleting}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                    title="删除会议"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
