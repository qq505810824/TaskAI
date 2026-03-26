'use client';

import { Clock, Users } from 'lucide-react';
import type { Meet } from '@/types/meeting';

interface MeetInfoProps {
  meet: Meet;
}

export const MeetInfo = ({ meet }: MeetInfoProps) => {
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '未设置';
    return new Date(dateString).toLocaleString('zh-CN');
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

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      ongoing: 'bg-green-100 text-green-700',
      ended: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-gray-900">{meet.title}</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(meet.status)}`}>
          {getStatusText(meet.status)}
        </span>
      </div>
      {meet.description && (
        <p className="text-sm text-gray-600 mb-3">{meet.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {meet.start_time && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatTime(meet.start_time)}</span>
          </div>
        )}
        {meet.duration && (
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>预计 {meet.duration} 分钟</span>
          </div>
        )}
      </div>
    </div>
  );
};
