import { useState, useCallback } from 'react';
import type { User, ApiResponse, IdentifyUserRequest } from '@/types/meeting';

export const useUser = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identifyUser = useCallback(async (userData: IdentifyUserRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data: ApiResponse<{
        id: string;
        name: string | null;
        meta: {
          platform: {
            platform: string;
            platform_user_id: string;
            platform_username: string | null;
            platform_display_name: string | null;
            created_at: string;
          };
        };
        isNewUser: boolean;
      }> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to identify user');
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

  const getCurrentUser = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/current', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<{
        id: string;
        name: string | null;
        email: string | null;
        role: string;
        avatar_url: string | null;
        meta: {
          platform: {
            platform: string;
            platform_user_id: string;
            platform_username: string | null;
            platform_display_name: string | null;
            created_at: string;
          };
        };
        createdAt: string;
        updatedAt: string;
      }> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch current user');
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

  const getUserById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${id}`);
      const data: ApiResponse<{
        id: string;
        name: string | null;
        email: string | null;
        role: string;
        avatar_url: string | null;
        meta: {
          platform: {
            platform: string;
            platform_user_id: string;
            platform_username: string | null;
            platform_display_name: string | null;
            created_at: string;
          };
        };
        createdAt: string;
        updatedAt: string;
      }> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch user');
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
    identifyUser,
    getCurrentUser,
    getUserById,
  };
};
