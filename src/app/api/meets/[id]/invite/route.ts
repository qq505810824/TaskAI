import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/meetings/[id]/invite - 获取会议邀请信息（基本信息）
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        // 处理 Next.js 15+ 的异步 params
        const resolvedParams = await Promise.resolve(params);
        const id = resolvedParams.id;

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'Meeting ID is required',
                },
                { status: 400 }
            );
        }

        // 查询会议基本信息
        const { data: meet, error: meetError } = await supabaseAdmin
            .from('meets')
            .select('id, title, meeting_code, join_url, start_time, duration, status')
            .eq('id', id)
            .single();

        if (meetError) {
            if (meetError.code === 'PGRST116' || meetError.message.includes('Results contain 0 rows')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Not found',
                        message: 'Meeting not found',
                    },
                    { status: 404 }
                );
            }
            throw new Error(`Failed to fetch meet: ${meetError.message}`);
        }

        const response: ApiResponse<{
            id: string;
            title: string;
            meeting_code: string;
            join_url: string;
            start_time: string | null;
            duration: number | null;
            status: string;
        }> = {
            success: true,
            data: {
                id: meet.id,
                title: meet.title,
                meeting_code: meet.meeting_code,
                join_url: meet.join_url,
                start_time: meet.start_time,
                duration: meet.duration,
                status: meet.status,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in POST /api/meetings/[id]/invite:', error);
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
