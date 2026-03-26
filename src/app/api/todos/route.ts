import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, Todo } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/todos - 获取任务列表
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const meetId = searchParams.get('meetId');
        const status = searchParams.get('status');
        const assigneeId = searchParams.get('assigneeId'); // 系统用户ID
        const platform = searchParams.get('platform'); // 平台类型
        const platformUserId = searchParams.get('platformUserId'); // 平台用户ID
        const sortBy = searchParams.get('sortBy') || 'created_at'; // 排序字段
        const order = searchParams.get('order') || 'desc'; // 排序顺序

        let query = supabaseAdmin.from('todos').select('*');

        // 按会议ID筛选
        if (meetId) {
            query = query.eq('meet_id', meetId);
        }

        // 按状态筛选
        if (status) {
            query = query.eq('status', status);
        }

        // 按平台信息筛选（通过平台ID查找系统用户ID）
        if (platform && platformUserId) {
            // 先查找匹配的用户
            // 使用 JSONB 查询语法：meta->'platform'->>'platform'
            const { data: matchedUsers, error: userError } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq("meta->'platform'->>'platform'", platform)
                .eq("meta->'platform'->>'platform_user_id'", platformUserId)
                .limit(1);

            if (userError) {
                throw new Error(`Failed to find user: ${userError.message}`);
            }

            if (matchedUsers && matchedUsers.length > 0) {
                // 使用找到的用户ID筛选任务
                query = query.eq('assignee_id', matchedUsers[0].id);
            } else {
                // 如果找不到用户，返回空列表
                const response: ApiResponse<{
                    todos: Todo[];
                    total: number;
                }> = {
                    success: true,
                    data: {
                        todos: [],
                        total: 0,
                    },
                };
                return NextResponse.json(response);
            }
        } else if (assigneeId) {
            // 按系统用户ID筛选
            query = query.eq('assignee_id', assigneeId);
        }

        // 排序
        const orderByColumn = sortBy === 'due_date' ? 'due_date' : sortBy === 'priority' ? 'priority' : 'created_at';
        query = query.order(orderByColumn, { ascending: order === 'asc' });

        const { data: todos, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch todos: ${error.message}`);
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
        console.error('Error in GET /api/todos:', error);
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

// POST /api/todos - 创建任务
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { meetId, title, description, assigneeId, dueDate, reminderTime, priority } = body;

        if (!meetId || !title) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'meetId and title are required',
                },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();

        const { data: newTodo, error } = await supabaseAdmin
            .from('todos')
            .insert({
                meet_id: meetId,
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

        if (error) {
            throw new Error(`Failed to create todo: ${error.message}`);
        }

        const response: ApiResponse<Todo> = {
            success: true,
            data: newTodo as Todo,
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/todos:', error);
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
