export type TaskaiOrgMemberRole = 'owner' | 'member';

export type TaskaiTaskStatus = 'open' | 'in_progress' | 'completed';

export type TaskaiTaskType = 'one_time' | 'recurring';

export type TaskaiRecurringFrequency = 'daily' | 'weekly' | 'monthly';

export interface TaskaiMembership {
    id: string;
    org_id: string;
    role: TaskaiOrgMemberRole;
    points_balance: number;
    points_earned_total: number;
    organization: {
        id: string;
        name: string;
        description: string | null;
        points_pool_total: number | null;
        points_pool_remaining: number | null;
    };
}

export interface TaskaiTaskRow {
    id: string;
    org_id: string;
    goal_id: string | null;
    title: string;
    description: string | null;
    points: number;
    type: TaskaiTaskType;
    recurring_frequency: TaskaiRecurringFrequency | null;
    status: TaskaiTaskStatus;
    category: string | null;
    assignee_user_id: string | null;
    created_at: string;
    updated_at: string;
    /** joined in API */
    assignee_display_name?: string | null;
}
