import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, Meet } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/meets/[id] - 获取会议详情
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

        // 查询会议
        const { data: meet, error: meetError } = await supabaseAdmin
            .from('meets')
            .select('*')
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

        // 获取相关对话、任务和总结
        const [
            { data: conversations, error: convError },
            { data: todos, error: todoError },
            { data: summary, error: summaryError },
        ] = await Promise.all([
            supabaseAdmin
                .from('conversations')
                .select(
                    [
                        'id',
                        'meet_id',
                        'user_id',
                        'user_meet_id',
                        'user_message_text',
                        'user_audio_url',
                        'user_audio_duration',
                        'ai_response_text',
                        'ai_audio_duration',
                        'user_sent_at',
                        'ai_responded_at',
                        'created_at',
                    ].join(',')
                )
                .eq('meet_id', id)
                .order('created_at', { ascending: true }),
            supabaseAdmin.from('todos').select('*').eq('meet_id', id).order('created_at', { ascending: false }),
            supabaseAdmin.from('meet_summaries').select('*').eq('meet_id', id).maybeSingle(),
        ]);

        if (convError) {
            console.warn('Failed to fetch conversations for meet:', id, convError.message);
        }
        if (todoError) {
            console.warn('Failed to fetch todos for meet:', id, todoError.message);
        }
        if (summaryError) {
            console.warn('Failed to fetch summary for meet:', id, summaryError.message);
        }

        const response: ApiResponse<
            Meet & {
                conversations?: any[];
                todos?: any[];
                summary?: any;
            }
        > = {
            success: true,
            data: {
                ...(meet as Meet),
                conversations: conversations || [],
                todos: todos || [],
                summary: summary || null,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in GET /api/meets/[id]:', error);
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

// PUT /api/meets/[id] - 更新会议信息
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
                    message: 'Meeting ID is required',
                },
                { status: 400 }
            );
        }

        // 验证会议是否存在
        const { data: existingMeet, error: meetError } = await supabaseAdmin
            .from('meets')
            .select('id, status')
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

        // 已结束的会议不能修改
        // if (existingMeet.status === 'ended') {
        //     return NextResponse.json(
        //         {
        //             success: false,
        //             error: 'Validation error',
        //             message: 'Cannot update ended meeting',
        //         },
        //         { status: 400 }
        //     );
        // }

        const body = await request.json();
        const { title, description, startTime, duration } = body;

        // 构建更新对象
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (title !== undefined) {
            updateData.title = title;
        }
        if (description !== undefined) {
            updateData.description = description || null;
        }
        if (startTime !== undefined) {
            updateData.start_time = startTime || null;
        }
        if (duration !== undefined) {
            updateData.duration = duration || null;
        }

        // 更新会议
        const { data: updatedMeet, error: updateError } = await supabaseAdmin
            .from('meets')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            throw new Error(`Failed to update meet: ${updateError.message}`);
        }

        const response: ApiResponse<Meet> = {
            success: true,
            data: updatedMeet as Meet,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in PUT /api/meets/[id]:', error);
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

// DELETE /api/meets/[id] - 删除会议及其所有关联数据
export async function DELETE(
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

        // 先验证会议是否存在
        const { data: meet, error: meetError } = await supabaseAdmin
            .from('meets')
            .select('id, title, meeting_code')
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

        // 统计关联数据数量（用于日志和响应）
        const [{ count: todosCount }, { count: summariesCount }, { count: recordingsCount }] = await Promise.all([
            supabaseAdmin.from('todos').select('id', { count: 'exact', head: true }).eq('meet_id', id),
            supabaseAdmin.from('meet_summaries').select('id', { count: 'exact', head: true }).eq('meet_id', id),
            supabaseAdmin.from('recordings').select('id', { count: 'exact', head: true }).eq('meet_id', id),
        ]);

        // 删除关联数据（虽然数据库有 CASCADE，但手动删除可以更好地记录日志）
        // 注意：由于数据库设置了 ON DELETE CASCADE，这些删除操作是可选的
        // 但手动删除可以让我们更好地控制删除顺序和错误处理

        // 1. 删除对话记录（audio_responses 会通过 CASCADE 自动删除）
        const { error: convDeleteError } = await supabaseAdmin
            .from('conversations')
            .delete()
            .eq('meet_id', id);

        if (convDeleteError) {
            console.warn('Failed to delete conversations for meet:', id, convDeleteError.message);
            // 不阻止继续，因为 CASCADE 会处理
        }

        // 2. 删除任务
        const { error: todosDeleteError } = await supabaseAdmin
            .from('todos')
            .delete()
            .eq('meet_id', id);

        if (todosDeleteError) {
            console.warn('Failed to delete todos for meet:', id, todosDeleteError.message);
            // 不阻止继续，因为 CASCADE 会处理
        }

        // 3. 删除会议总结
        const { error: summaryDeleteError } = await supabaseAdmin
            .from('meet_summaries')
            .delete()
            .eq('meet_id', id);

        if (summaryDeleteError) {
            console.warn('Failed to delete meet_summaries for meet:', id, summaryDeleteError.message);
            // 不阻止继续，因为 CASCADE 会处理
        }

        // 4. 删除录音文件记录
        const { error: recordingsDeleteError } = await supabaseAdmin
            .from('recordings')
            .delete()
            .eq('meet_id', id);

        if (recordingsDeleteError) {
            console.warn('Failed to delete recordings for meet:', id, recordingsDeleteError.message);
            // 不阻止继续，因为 CASCADE 会处理
        }

        // 5. 最后删除会议本身
        const { error: meetDeleteError } = await supabaseAdmin
            .from('meets')
            .delete()
            .eq('id', id);

        if (meetDeleteError) {
            throw new Error(`Failed to delete meet: ${meetDeleteError.message}`);
        }

        // 记录删除日志
        console.log(`Deleted meet ${id} (${meet.meeting_code}) with:`, {
            todos: todosCount || 0,
            summaries: summariesCount || 0,
            recordings: recordingsCount || 0,
        });

        const response: ApiResponse<{
            deleted: boolean;
            meetId: string;
            meetingCode: string;
            deletedCounts: {
                todos: number;
                summaries: number;
                recordings: number;
            };
        }> = {
            success: true,
            data: {
                deleted: true,
                meetId: id,
                meetingCode: meet.meeting_code,
                deletedCounts: {
                    todos: todosCount || 0,
                    summaries: summariesCount || 0,
                    recordings: recordingsCount || 0,
                },
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in DELETE /api/meets/[id]:', error);
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
