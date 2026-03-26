import type { ApiResponse, Conversation, SendMessageRequest } from '@/types/meeting';
import { useCallback, useState } from 'react';

export const useConversations = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getConversations = useCallback(async (params?: {
        meetId?: string;
        page?: number;
        limit?: number;
    }) => {
        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams();
            if (params?.meetId) queryParams.set('meetId', params.meetId);
            if (params?.page) queryParams.set('page', params.page.toString());
            if (params?.limit) queryParams.set('limit', params.limit.toString());

            const response = await fetch(`/api/conversations?${queryParams.toString()}`);
            const data: ApiResponse<{
                conversations: Conversation[];
                total: number;
            }> = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch conversations');
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

    const sendMessage = useCallback(async (messageData: SendMessageRequest) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/conversations/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messageData),
            });

            const data: ApiResponse<{
                conversation_id: string; // Dify conversation_id
                conversationId: string;
                userMessage: string;
                aiResponseText: string;
                aiAudioUrl: string;
                aiAudioDuration: number;
                userSentAt: string;
                aiRespondedAt: string;
            }> = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to send message');
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
        getConversations,
        sendMessage,
    };
};
