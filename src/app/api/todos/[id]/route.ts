import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, Todo } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// PUT /api/todos/[id] - 更新任务
export async function PUT(
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
        const {
            title,
            description,
            status,
            assigneeId,
            dueDate,
            reminderTime,
            priority,
        } = body;

        // 构建更新对象，只包含提供的字段
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description || null;
        if (status !== undefined) updateData.status = status;
        if (assigneeId !== undefined) updateData.assignee_id = assigneeId || null;
        if (dueDate !== undefined) updateData.due_date = dueDate || null;
        if (reminderTime !== undefined) updateData.reminder_time = reminderTime || null;
        if (priority !== undefined) updateData.priority = priority;

        // 如果状态变为 completed，设置 completed_at
        if (status === 'completed') {
            updateData.completed_at = new Date().toISOString();
        } else if (status !== 'completed' && status !== undefined) {
            // 如果状态从 completed 变为其他状态，清除 completed_at
            updateData.completed_at = null;
        }

        // 更新任务
        const { data: updatedTodo, error } = await supabaseAdmin
            .from('todos')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116' || error.message.includes('Results contain 0 rows')) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Not found',
                        message: 'Todo not found',
                    },
                    { status: 404 }
                );
            }
            throw new Error(`Failed to update todo: ${error.message}`);
        }

        const response: ApiResponse<Todo> = {
            success: true,
            data: updatedTodo as Todo,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in PUT /api/todos/[id]:', error);
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
