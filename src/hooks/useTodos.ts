import { useState, useCallback } from 'react';
import type { Todo, ApiResponse, MeetSummary } from '@/types/meeting';

export const useTodos = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTodos = useCallback(async (params?: {
    meetId?: string;
    status?: string;
    assigneeId?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (params?.meetId) queryParams.set('meetId', params.meetId);
      if (params?.status) queryParams.set('status', params.status);
      if (params?.assigneeId) queryParams.set('assigneeId', params.assigneeId);

      const response = await fetch(`/api/todos?${queryParams.toString()}`);
      const data: ApiResponse<{
        todos: Todo[];
        total: number;
      }> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch todos');
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

  const generateTodos = useCallback(async (meetId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/todos/generate-llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetId }),
      });

      const data: ApiResponse<{
        todos: Todo[];
        summary: MeetSummary;
      }> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate todos');
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

  const createTodo = useCallback(async (todoData: {
    meetId: string;
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    reminderTime?: string;
    priority?: 'low' | 'medium' | 'high';
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todoData),
      });

      const data: ApiResponse<Todo> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create todo');
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

  const updateTodo = useCallback(async (id: string, updates: Partial<Todo>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data: ApiResponse<Todo> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update todo');
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

  const confirmTodo = useCallback(async (id: string, reminderTime?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/todos/${id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reminderTime }),
      });

      const data: ApiResponse<{
        id: string;
        status: string;
        reminderTime: string | null;
      }> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to confirm todo');
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
    getTodos,
    generateTodos,
    createTodo,
    updateTodo,
    confirmTodo,
  };
};
