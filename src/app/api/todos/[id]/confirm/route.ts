import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/todos/[id]/confirm - 确认任务
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
                    message: 'Todo ID is required',
                },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { reminderTime } = body;

        // 先获取当前任务信息
        const { data: currentTodo, error: fetchError } = await supabaseAdmin
            .from('todos')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116' || fetchError.message.includes('Results contain 0 rows')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Not found',
                        message: 'Todo not found',
                    },
                    { status: 404 }
                );
            }
            throw new Error(`Failed to fetch todo: ${fetchError.message}`);
        }

        // 更新任务状态为 confirmed
        const updateData: any = {
            status: 'confirmed',
            updated_at: new Date().toISOString(),
        };

        // 如果提供了 reminderTime，则更新；否则保持原有值
        if (reminderTime !== undefined) {
            updateData.reminder_time = reminderTime || null;
        }

        const { data: updatedTodo, error: updateError } = await supabaseAdmin
            .from('todos')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Failed to confirm todo: ${updateError.message}`);
        }

        const response: ApiResponse<{
            id: string;
            status: string;
            reminderTime: string | null;
        }> = {
            success: true,
            data: {
                id: updatedTodo.id,
                status: updatedTodo.status,
                reminderTime: updatedTodo.reminder_time,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in POST /api/todos/[id]/confirm:', error);
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
