import type { ApiResponse, CreateMeetRequest, Meet } from '@/types/meeting';
import { useCallback, useState } from 'react';

export const useMeets = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getMeets = useCallback(async (params?: {
        hostId?: string;
        status?: string;
        title?: string;
        page?: number;
        limit?: number;
    }) => {
        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams();
            if (params?.hostId) queryParams.set('hostId', params.hostId);
            if (params?.status) queryParams.set('status', params.status);
            if (params?.title) queryParams.set('title', params.title);
            if (params?.page) queryParams.set('page', params.page.toString());
            if (params?.limit) queryParams.set('limit', params.limit.toString());

            const response = await fetch(`/api/meets?${queryParams.toString()}`);
            const data: ApiResponse<{
                meets: (Meet & { hostName?: string | null })[];
                total: number;
                page: number;
                limit: number;
            }> = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch meets');
            }

            return data.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getMeetById = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/meets/${id}`);
            const data: ApiResponse<
                Meet & {
                    conversations?: any[];
                    todos?: any[];
                    summary?: any;
                }
            > = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch meet');
            }

            return data.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getMeetByCode = useCallback(async (code: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/meets/code/${code}`);
            const data: ApiResponse<{
                id: string;
                meetingCode: string;
                title: string;
                status: string;
                joinUrl: string;
            }> = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch meet');
            }

            return data.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const createMeet = useCallback(async (meetData: CreateMeetRequest) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/meets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(meetData),
            });

            const data: ApiResponse<Meet> = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to create meet');
            }

            return data.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateMeetStatus = useCallback(async (id: string, status: 'ongoing' | 'ended' | 'cancelled') => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/meets/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status }),
            });

            const data: ApiResponse<{
                id: string;
                status: string;
                updatedAt: string;
            }> = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to update meet status');
            }

            return data.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateMeet = useCallback(async (id: string, meetData: {
        title?: string;
        description?: string;
        startTime?: string;
        duration?: number;
    }) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/meets/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(meetData),
            });

            const data: ApiResponse<Meet> = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to update meet');
            }

            return data.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteMeet = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/meets/${id}`, {
                method: 'DELETE',
            });

            const data: ApiResponse<{
                deleted: boolean;
                meetId: string;
                meetingCode: string;
                deletedCounts: {
                    conversations: number;
                    todos: number;
                    summaries: number;
                    recordings: number;
                };
            }> = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to delete meet');
            }

            return data.data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        getMeets,
        getMeetById,
        getMeetByCode,
        createMeet,
        updateMeetStatus,
        updateMeet,
        deleteMeet,
    };
};
