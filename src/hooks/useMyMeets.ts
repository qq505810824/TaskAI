
'use client';

import { useAuth } from '@/contexts/AuthContext';
import type { MyUserMeet } from '@/types/meet';
import { useEffect, useState } from 'react';

export function useMyMeets() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userMeets, setUserMeets] = useState<MyUserMeet[]>([]);

    useEffect(() => {
        if (!user || isAuthLoading) return;

        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch(`/api/my/meets?userId=${encodeURIComponent(user.id)}`);
                const data = await res.json();
                if (!data.success) {
                    throw new Error(data.error || data.message || 'Failed to fetch my meets');
                }
                setUserMeets(data.data.userMeets || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [user, isAuthLoading]);

    return { user, userMeets, isLoading: loading || isAuthLoading, error };
}
