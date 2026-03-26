
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { MyUserMeet } from '@/types/meet';
import { Todo } from '@/types/meeting';
import { useCallback, useEffect, useState } from 'react';

export function useMyOverview() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        completedSessions: 0,
        pendingTodos: 0,
        avgDuration: 0,
    });
    const [trendData, setTrendData] = useState<{ name: string; interviews: number }[]>([]);
    const [recentMeets, setRecentMeets] = useState<MyUserMeet[]>([]);

    const fetchData = useCallback(async () => {
        if (!user) return;

        setIsLoading(true);
        setError(null);

        try {
            // Fetch meets and todos in parallel
            const [meetsRes, todosRes] = await Promise.all([
                fetch(`/api/my/meets?userId=${encodeURIComponent(user.id)}`),
                fetch(`/api/my/todos?userId=${encodeURIComponent(user.id)}`)
            ]);

            const [meetsData, todosData] = await Promise.all([
                meetsRes.json(),
                todosRes.json()
            ]);

            if (!meetsData.success || !todosData.success) {
                throw new Error('Failed to fetch overview data');
            }

            const userMeets: MyUserMeet[] = meetsData.data.userMeets || [];
            const todos: Todo[] = todosData.data.todos || [];

            // Calculate stats
            const completedMeets = userMeets.filter(m => m.status === 'completed');
            const pendingTodosCount = todos.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;

            let totalDuration = 0;
            completedMeets.forEach(m => {
                if (m.joined_at && m.completed_at) {
                    const duration = (new Date(m.completed_at).getTime() - new Date(m.joined_at).getTime()) / (1000 * 60);
                    totalDuration += duration;
                }
            });
            const avgDuration = completedMeets.length > 0 ? Math.round(totalDuration / completedMeets.length) : 0;

            setStats({
                completedSessions: completedMeets.length,
                pendingTodos: pendingTodosCount,
                avgDuration,
            });

            // Prepare trend data (last 7 days)
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return {
                    date: d.toISOString().split('T')[0],
                    name: days[d.getDay()],
                    interviews: 0
                };
            });

            completedMeets.forEach(m => {
                const mDate = new Date(m.joined_at).toISOString().split('T')[0];
                const trendDay = last7Days.find(d => d.date === mDate);
                if (trendDay) {
                    trendDay.interviews += 1;
                }
            });

            setTrendData(last7Days.map(({ name, interviews }) => ({ name, interviews })));
            setRecentMeets(userMeets.slice(0, 5));

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!isAuthLoading && user) {
            void fetchData();
        }
    }, [user, isAuthLoading, fetchData]);

    return {
        user,
        stats,
        trendData,
        recentMeets,
        isLoading: isLoading || isAuthLoading,
        error,
        refresh: fetchData
    };
}
