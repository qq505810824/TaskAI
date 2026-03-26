import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/meets/[id]/status - 更新会议状态
export async function PATCH(
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

        const body = await request.json();
        const { status } = body;

        if (!status || !['ongoing', 'ended', 'cancelled'].includes(status)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'Invalid status',
                },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();
        const endedAt = status === 'ended' ? now : null;

        const { data: updated, error } = await supabaseAdmin
            .from('meets')
            .update({
                status,
                updated_at: now,
                ended_at: endedAt,
            })
            .eq('id', id)
            .select('id, status, updated_at')
            .single();

        if (error) {
            if (error.code === 'PGRST116' || error.message.includes('Results contain 0 rows')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Not found',
                        message: 'Meeting not found',
                    },
                    { status: 404 }
                );
            }
            throw new Error(`Failed to update meet status: ${error.message}`);
        }

        const response: ApiResponse<{
            id: string;
            status: string;
            updatedAt: string;
        }> = {
            success: true,
            data: {
                id: updated.id,
                status: updated.status,
                updatedAt: updated.updated_at,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in PATCH /api/meets/[id]/status:', error);
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
