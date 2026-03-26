import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

interface JoinUserMeetRequest {
    meetId: string;
    userId: string;
}

// POST /api/user-meets/join - 为当前用户和会议创建/获取用户会议实例
export async function POST(request: NextRequest) {
    try {
        const body: JoinUserMeetRequest = await request.json();
        const { meetId, userId } = body;

        if (!meetId || !userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'meetId and userId are required',
                },
                { status: 400 }
            );
        }

        // 1) 尝试查找已有的 user_meets 记录
        const { data: existing, error: queryError } = await supabaseAdmin
            .from('user_meets')
            .select('*')
            .eq('meet_id', meetId)
            .eq('user_id', userId)
            .limit(1);

        if (queryError) {
            console.error('Failed to query user_meets:', queryError);
            throw new Error(queryError.message);
        }

        let userMeet = existing && existing.length > 0 ? existing[0] : null;

        // 2) 不存在则创建新的用户会议实例
        if (!userMeet) {
            const now = new Date().toISOString();
            const { data: inserted, error: insertError } = await supabaseAdmin
                .from('user_meets')
                .insert({
                    meet_id: meetId,
                    user_id: userId,
                    status: 'in_progress',
                    joined_at: now,
                })
                .select()
                .single();

            if (insertError) {
                console.error('Failed to insert user_meets:', insertError);
                throw new Error(insertError.message);
            }

            userMeet = inserted;
        }

        const response: ApiResponse<{
            id: string;
            meet_id: string;
            user_id: string;
            status: string;
            joined_at: string;
            completed_at: string | null;
        }> = {
            success: true,
            data: {
                id: userMeet.id,
                meet_id: userMeet.meet_id,
                user_id: userMeet.user_id,
                status: userMeet.status,
                joined_at: userMeet.joined_at,
                completed_at: userMeet.completed_at ?? null,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in POST /api/user-meets/join:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

