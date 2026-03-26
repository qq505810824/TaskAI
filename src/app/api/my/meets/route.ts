import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, Meet } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/my/meets?userId=xxx - 获取当前用户的 user_meets 列表
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'userId is required',
                },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('user_meets')
            .select(
                `
                id,
                meet_id,
                user_id,
                status,
                joined_at,
                completed_at,
                meet:meets (
                    id,
                    meeting_code,
                    title,
                    status,
                    join_url
                )
            `
            )
            .eq('user_id', userId)
            .order('joined_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch user_meets: ${error.message}`);
        }

        const response: ApiResponse<{
            userMeets: Array<
                {
                    id: string;
                    meet_id: string;
                    user_id: string;
                    status: string;
                    joined_at: string;
                    completed_at: string | null;
                } & {
                    meet: Pick<Meet, 'id' | 'meeting_code' | 'title' | 'status' | 'join_url'> | null;
                }
            >;
        }> = {
            success: true,
            data: {
                userMeets: (data || []) as any,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in GET /api/my/meets:', error);
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

