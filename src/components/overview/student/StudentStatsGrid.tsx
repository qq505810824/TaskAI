
'use client';

import { OverviewCard } from '../common/OverviewCard';
import { UserCheck, ListTodo, Clock } from 'lucide-react';

interface StudentStatsGridProps {
    stats: {
        completedSessions: number;
        pendingTodos: number;
        avgDuration: number;
    };
    isLoading?: boolean;
}

export const StudentStatsGrid = ({ stats, isLoading }: StudentStatsGridProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <OverviewCard
                title="已完成会议"
                value={stats.completedSessions}
                subValue="本月参与的 AI 导师对话"
                icon={UserCheck}
                colorClass="text-indigo-600 bg-indigo-50"
                isLoading={isLoading}
            />
            <OverviewCard
                title="我的待办任务"
                value={stats.pendingTodos}
                subValue="需要跟进的行动项"
                icon={ListTodo}
                colorClass="text-purple-600 bg-purple-50"
                isLoading={isLoading}
            />
            <OverviewCard
                title="平均通话时长"
                value={`${stats.avgDuration} 分钟`}
                subValue="单次会话的平均投入程度"
                icon={Clock}
                colorClass="text-blue-600 bg-blue-50"
                isLoading={isLoading}
            />
        </div>
    );
};
