'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTodos } from '@/hooks/useTodos';
import type { MyTodo } from '@/types/todo';
import { useCallback, useEffect, useState } from 'react';

export function useMyTodos() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { updateTodo, confirmTodo } = useTodos();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [todos, setTodos] = useState<MyTodo[]>([]);
    const [titleFilter, setTitleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [meetingCodeFilter, setMeetingCodeFilter] = useState('');

    const fetchTodos = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            params.set('userId', user.id);
            if (titleFilter.trim()) params.set('title', titleFilter.trim());
            if (statusFilter) params.set('status', statusFilter);
            if (priorityFilter) params.set('priority', priorityFilter);
            if (meetingCodeFilter.trim()) params.set('meetingCode', meetingCodeFilter.trim());

            const res = await fetch(`/api/my/todos?${params.toString()}`);
            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || data.message || 'Failed to fetch my todos');
            }
            setTodos(data.data.todos || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [user, titleFilter, statusFilter, priorityFilter, meetingCodeFilter]);

    useEffect(() => {
        if (!user || isAuthLoading) return;
        void fetchTodos();
    }, [user, isAuthLoading, fetchTodos]);

    const handleConfirmTodo = async (id: string) => {
        try {
            await confirmTodo(id);
            setTodos(prev => prev.map(t => t.id === id ? { ...t, status: 'confirmed' as const } : t));
        } catch (err) {
            console.error('Failed to confirm todo:', err);
        }
    };

    const handleUpdateTodo = async (id: string, updates: Partial<MyTodo>) => {
        try {
            await updateTodo(id, updates);
            setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        } catch (err) {
            console.error('Failed to update todo:', err);
        }
    };

    const handleResetFilters = () => {
        setTitleFilter('');
        setStatusFilter('');
        setPriorityFilter('');
        setMeetingCodeFilter('');
    };

    return {
        user,
        todos,
        isLoading: loading || isAuthLoading,
        error,
        titleFilter,
        statusFilter,
        priorityFilter,
        meetingCodeFilter,
        setTitleFilter,
        setStatusFilter,
        setPriorityFilter,
        setMeetingCodeFilter,
        fetchTodos,
        handleConfirmTodo,
        handleUpdateTodo,
        handleResetFilters
    };
}
