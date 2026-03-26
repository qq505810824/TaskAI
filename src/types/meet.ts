
export interface MyUserMeet {
    id: string;
    meet_id: string;
    user_id: string;
    status: string;
    joined_at: string;
    completed_at: string | null;
    meet?: {
        id: string;
        meeting_code: string;
        title: string;
        status: string;
        join_url: string;
    } | null;
}
