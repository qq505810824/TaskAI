'use client'

import { OverviewChart } from '@/components/overview/common/OverviewChart'
import type { TaskaiTrendPoint } from '@/hooks/taskai/useTaskaiTrend'

export function WeeklyActivityChart({
    data,
    loading,
}: {
    data: TaskaiTrendPoint[]
    loading?: boolean
}) {
    return <OverviewChart data={data} dataKey="completed" title="近7天完成趋势" color="#4f46e5" isLoading={loading} />
}
