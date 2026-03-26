
import type { Todo } from '@/types/meeting';

export interface MyTodo extends Todo {
    meet?: {
        id: string;
        meeting_code: string;
        title: string;
        status: string;
    } | null;
}
