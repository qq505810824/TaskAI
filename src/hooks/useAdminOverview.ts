
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import { MyUserMeet } from '@/types/meet';
import { useCallback, useEffect, useState } from 'react';

export function useAdminOverview() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const adminUser = user as User | null;
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        sessionsCompleted: 0,
        sessionsInProgress: 0,
        todosTotal: 0,
        todosCompletedRate: 0,
        avgDuration: 0,
    });
    const [trendData, setTrendData] = useState<{ name: string; interviews: number; tasks: number }[]>([]);
    const [allUserMeets, setAllUserMeets] = useState<MyUserMeet[]>([]);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        pageSize: 30,
        totalPages: 0
    });

    const fetchData = useCallback(async (page: number = 1) => {
        // if (!adminUser || adminUser.role !== 'admin') return;

        setIsLoading(true);
        setError(null);

        try {
            const [statsRes, trendRes, meetsRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/admin/trend'),
                fetch(`/api/admin/user-meets?page=${page}&pageSize=10`)
            ]);

            const [statsData, trendDataResult, meetsData] = await Promise.all([
                statsRes.json(),
                trendRes.json(),
                meetsRes.json()
            ]);

            if (!statsData.success || !trendDataResult.success || !meetsData.success) {
                throw new Error('Failed to fetch admin overview data');
            }

            setStats(statsData.data);
            setTrendData(trendDataResult.data);
            setAllUserMeets(meetsData.data.userMeets || []);
            setPagination(meetsData.data.pagination);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, [adminUser]);

    const handlePageChange = (newPage: number) => {
        void fetchData(newPage);
    };

    useEffect(() => {
        // if (!isAuthLoading && adminUser?.role === 'admin') {
        fetchData(1);
        // }
    }, []);

    return {
        stats,
        trendData,
        allUserMeets,
        pagination,
        handlePageChange,
        isLoading: isLoading || isAuthLoading,
        error,
        refresh: () => fetchData(pagination.page)
    };
}
