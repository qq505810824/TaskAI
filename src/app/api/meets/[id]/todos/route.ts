import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, Todo } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/meetings/[id]/todos - 获取会议的任务列表
export async function GET(
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

        // 验证会议是否存在
        const { data: meet, error: meetError } = await supabaseAdmin
            .from('meets')
            .select('id')
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
            throw new Error(`Failed to verify meet: ${meetError.message}`);
        }

        // 获取查询参数（可选筛选）
        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const sortBy = searchParams.get('sortBy') || 'created_at';
        const order = searchParams.get('order') || 'desc';

        // 查询该会议的所有任务
        let query = supabaseAdmin
            .from('todos')
            .select('*')
            .eq('meet_id', id);

        // 按状态筛选
        if (status) {
            query = query.eq('status', status);
        }

        // 排序
        const orderByColumn = sortBy === 'due_date' ? 'due_date' : sortBy === 'priority' ? 'priority' : 'created_at';
        query = query.order(orderByColumn, { ascending: order === 'asc' });

        const { data: todos, error: todosError } = await query;

        if (todosError) {
            throw new Error(`Failed to fetch todos: ${todosError.message}`);
        }

        // 手动处理优先级排序（如果按优先级排序）
        let sortedTodos = todos || [];
        if (sortBy === 'priority') {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            sortedTodos = sortedTodos.sort((a, b) => {
                const aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
                const bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
                return order === 'asc' ? aValue - bValue : bValue - aValue;
            });
        }

        const response: ApiResponse<{
            todos: Todo[];
            total: number;
        }> = {
            success: true,
            data: {
                todos: sortedTodos as Todo[],
                total: sortedTodos.length,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in GET /api/meetings/[id]/todos:', error);
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

// POST /api/meetings/[id]/todos - 为会议添加任务
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

        // 验证会议是否存在
        const { data: meet, error: meetError } = await supabaseAdmin
            .from('meets')
            .select('id')
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
            throw new Error(`Failed to verify meet: ${meetError.message}`);
        }

        const body = await request.json();
        const { title, description, assigneeId, dueDate, reminderTime, priority } = body;

        if (!title) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'title is required',
                },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();

        // 创建任务（meet_id 使用 URL 参数中的 id）
        const { data: newTodo, error: insertError } = await supabaseAdmin
            .from('todos')
            .insert({
                meet_id: id,
                title,
                description: description || null,
                assignee_id: assigneeId || null,
                status: 'draft',
                priority: priority || 'medium',
                due_date: dueDate || null,
                reminder_time: reminderTime || null,
                source: 'manual',
                created_at: now,
                updated_at: now,
                completed_at: null,
            })
            .select()
            .single();

        if (insertError) {
            throw new Error(`Failed to create todo: ${insertError.message}`);
        }

        const response: ApiResponse<Todo> = {
            success: true,
            data: newTodo as Todo,
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/meetings/[id]/todos:', error);
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
