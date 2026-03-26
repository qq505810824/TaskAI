
'use client';

import { OverviewCard } from '../common/OverviewCard';
import { Users, ListTodo, Activity } from 'lucide-react';

interface AdminStatsGridProps {
    stats: {
        sessionsCompleted: number;
        sessionsInProgress: number;
        todosTotal: number;
        todosCompletedRate: number;
        avgDuration: number;
    };
    isLoading?: boolean;
}

export const AdminStatsGrid = ({ stats, isLoading }: AdminStatsGridProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <OverviewCard
                title="全平台已完成会议"
                value={stats.sessionsCompleted}
                subValue={`当前有 ${stats.sessionsInProgress} 个会议正在进行`}
                icon={Users}
                colorClass="text-indigo-600 bg-indigo-50"
                isLoading={isLoading}
            />
            <OverviewCard
                title="全平台任务总数"
                value={stats.todosTotal}
                subValue={`${Math.round(stats.todosCompletedRate * 100)}% 的任务已完成`}
                icon={ListTodo}
                colorClass="text-purple-600 bg-purple-50"
                isLoading={isLoading}
            />
            <OverviewCard
                title="平均参与时长"
                value={`${stats.avgDuration} 分钟`}
                subValue="全组织范围内的平均会话时长"
                icon={Activity}
                colorClass="text-blue-600 bg-blue-50"
                isLoading={isLoading}
            />
        </div>
    );
};
