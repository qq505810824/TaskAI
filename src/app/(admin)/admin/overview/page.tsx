
'use client';

import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { AdminStatsGrid } from '@/components/overview/admin/AdminStatsGrid';
import { AllUserMeetsList } from '@/components/overview/admin/AllUserMeetsList';
import { OverviewChart } from '@/components/overview/common/OverviewChart';
import { useAdminOverview } from '@/hooks/useAdminOverview';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { LayoutDashboard, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminOverviewPage() {
    const {
        stats,
        trendData,
        allUserMeets,
        pagination,
        handlePageChange,
        isLoading,
        error,
        refresh
    } = useAdminOverview();
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    // useEffect(() => {
    //     if (!isAuthLoading && (!user || user.role !== 'admin')) {
    //         router.push('/');
    //     }
    // }, [user, isAuthLoading, router]);

    // if (isAuthLoading || !user || user.role !== 'admin') {
    //     return (
    //         <div className="h-[80vh] flex items-center justify-center">
    //             <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    //         </div>
    //     );
    // }
    const handleManageMeet = () => {
        router.push('/admin/meets');
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
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        <LayoutDashboard className="text-indigo-600" size={32} />
                        管理后台概览
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">
                        全平台 AI 会话监控、用户参与度分析及任务执行概况。
                    </p>
                </div>
                <div className='flex flex-row items-center gap-4'>
                    <button
                        onClick={() => refresh()}
                        disabled={isLoading}
                        className="px-6 py-3 cursor-pointer bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl flex items-center gap-3 shadow-sm transition-all font-semibold text-sm active:scale-[0.98] disabled:opacity-50"
                    >
                        <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
                        刷新数据
                    </button>

                    <button
                        onClick={() => handleManageMeet()}
                        className="px-6 py-3 cursor-pointer bg-indigo-500 text-white border border-gray-200 hover:bg-indigo-700 rounded-xl flex items-center gap-3 shadow-sm transition-all font-semibold text-sm active:scale-[0.98] disabled:opacity-50 "
                    >
                        <LayoutDashboard size={18} />
                        管理会议
                    </button>
                </div>
            </div>

            <ErrorDisplay error={error} />

            {/* Metrics */}
            <AdminStatsGrid stats={stats} isLoading={isLoading} />

            <div className="grid grid-cols-1 gap-10">
                {/* Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
                    <OverviewChart
                        data={trendData}
                        dataKey="interviews"
                        title="全平台 7 日会话趋势"
                        isLoading={isLoading}
                    />
                    <OverviewChart
                        data={trendData}
                        dataKey="tasks"
                        title="全平台 7 日任务生成趋势"
                        color="#9333ea"
                        isLoading={isLoading}
                    />
                </div>

                {/* All User Meets List */}
                <AllUserMeetsList
                    meets={allUserMeets}
                    isLoading={isLoading}
                    pagination={pagination}
                    onPageChange={handlePageChange}
                />
            </div>
        </motion.div>
    );
}
