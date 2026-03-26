
'use client';

import { AuthRequired } from '@/components/common/AuthRequired';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { OverviewChart } from '@/components/overview/common/OverviewChart';
import { RecentMeetsList } from '@/components/overview/student/RecentMeetsList';
import { StudentStatsGrid } from '@/components/overview/student/StudentStatsGrid';
import { useMyOverview } from '@/hooks/useMyOverview';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StudentOverviewPage() {
    const { stats, trendData, recentMeets, isLoading, error, user } = useMyOverview() as any;
    const router = useRouter();

    if (!user && !isLoading) {
        return <AuthRequired />;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">学习概览</h1>
                    <p className="text-gray-500 mt-2 text-lg">
                        欢迎回来，{user?.username || '同学'}。这是您最近的学习进展和活动分析。
                    </p>
                </div>

                <button
                    onClick={() => router.push('/')}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-3 shadow-md hover:shadow-lg transition-all font-semibold text-sm active:scale-[0.98]"
                >
                    <Plus size={20} />
                    开启新对话
                </button>
            </div>

            <ErrorDisplay error={error} />

            {/* Metrics */}
            <StudentStatsGrid stats={stats} isLoading={isLoading} />

            <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-10 space-y-4">
                {/* Chart */}
                <div className="lg:col-span-2">
                    <OverviewChart
                        data={trendData}
                        dataKey="interviews"
                        title="最近 7 日对话趋势"
                        isLoading={isLoading}
                    />
                </div>

                {/* Recent List */}
                <RecentMeetsList meets={recentMeets} isLoading={isLoading} />
            </div>
        </motion.div>
    );
}
