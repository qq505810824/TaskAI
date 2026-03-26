import { useAuth } from '@/contexts/AuthContext';
import { useMeets } from '@/hooks/useMeets';
import type { Meet } from '@/types/meeting';
import { useCallback, useEffect, useState } from 'react';

export interface MeetWithHost extends Meet {
    hostName?: string | null;
}

export interface MeetFilter {
    title?: string;
    status?: string;
}

export const useAdminMeets = () => {
    const { getMeets, createMeet, updateMeet, deleteMeet, loading, error } = useMeets();
    const { user } = useAuth();
    const [meets, setMeets] = useState<MeetWithHost[]>([]);
    const [filter, setFilter] = useState<MeetFilter>({});
    const [deletingMeetId, setDeletingMeetId] = useState<string | null>(null);

    // 加载会议列表（带筛选）
    // 注意：用户信息已由 API 通过关联查询返回，无需再次查询
    const loadMeets = useCallback(
        async (filterParams?: MeetFilter) => {
            try {
                const currentFilter = filterParams || filter;
                const data = await getMeets({
                    status: currentFilter.status,
                    title: currentFilter.title,
                    limit: 100,
                });

                if (data) {
                    // API 已经返回了 hostName，直接使用
                    setMeets(data.meets as MeetWithHost[]);
                }
            } catch (err) {
                console.error('Failed to load meets:', err);
            }
        },
        [getMeets]
    );

    // 创建会议
    const handleCreateMeet = useCallback(
        async (data: { title: string; description: string; startTime: string; duration: number }) => {
            if (!user?.id) {
                throw new Error('User not authenticated');
            }

            try {
                const newMeet = await createMeet({
                    title: data.title,
                    description: data.description || undefined,
                    startTime: data.startTime || new Date().toISOString(),
                    duration: data.duration,
                    hostId: user.id,
                });

                if (newMeet) {
                    // 创建者信息：使用当前用户信息（因为刚创建的会议，创建者就是当前用户）
                    const meetWithHost: MeetWithHost = {
                        ...newMeet,
                        hostName: user.username || user.email || '未知用户',
                    };
                    setMeets((prev) => [meetWithHost, ...prev]);
                    return newMeet;
                }
            } catch (err) {
                console.error('Failed to create meet:', err);
                throw err;
            }
        },
        [createMeet, user?.id, user?.username, user?.email]
    );

    // 更新会议
    const handleUpdateMeet = useCallback(
        async (meetId: string, data: { title: string; description: string; startTime: string; duration: number }) => {
            try {
                const updatedMeet = await updateMeet(meetId, {
                    title: data.title,
                    description: data.description || undefined,
                    startTime: data.startTime || undefined,
                    duration: data.duration,
                });

                if (updatedMeet) {
                    // 更新列表中的会议，保留 hostName
                    setMeets((prev) =>
                        prev.map((meet) => (meet.id === updatedMeet.id ? { ...updatedMeet, hostName: meet.hostName } : meet))
                    );
                    return updatedMeet;
                }
            } catch (err) {
                console.error('Failed to update meet:', err);
                throw err;
            }
        },
        [updateMeet]
    );

    // 删除会议
    const handleDeleteMeet = useCallback(
        async (meetId: string) => {
            setDeletingMeetId(meetId);
            try {
                await deleteMeet(meetId);
                setMeets((prev) => prev.filter((meet) => meet.id !== meetId));
            } catch (err) {
                console.error('Failed to delete meet:', err);
                throw err;
            } finally {
                setDeletingMeetId(null);
            }
        },
        [deleteMeet]
    );

    // 更新筛选条件
    const updateFilter = useCallback(
        (newFilter: MeetFilter) => {
            setFilter(newFilter);
            // 使用新的筛选条件加载数据
            loadMeets(newFilter);
        },
        [loadMeets]
    );

    // 清除筛选
    const clearFilter = useCallback(() => {
        const emptyFilter: MeetFilter = {};
        setFilter(emptyFilter);
        loadMeets(emptyFilter);
    }, [loadMeets]);

    // 初始化加载
    useEffect(() => {
        loadMeets();
    }, []);

    return {
        meets,
        filter,
        loading,
        error,
        deletingMeetId,
        loadMeets,
        handleCreateMeet,
        handleUpdateMeet,
        handleDeleteMeet,
        updateFilter,
        clearFilter,
    };
};
