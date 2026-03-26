import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, CreateMeetRequest, Meet } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/meets - 获取会议列表
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const hostId = searchParams.get('hostId');
        const status = searchParams.get('status');
        const title = searchParams.get('title'); // 标题筛选
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        // 使用关联查询获取用户信息，避免 N+1 查询问题
        // host:users(*) 表示通过 host_id 外键关联 users 表，别名为 host
        let query = supabaseAdmin
            .from('meets')
            .select('*, host:users!host_id(id, name, email)', { count: 'exact' });

        // 筛选
        if (hostId) {
            query = query.eq('host_id', hostId);
        }
        if (status) {
            query = query.eq('status', status);
        }
        if (title) {
            // 使用 ilike 进行不区分大小写的模糊匹配
            query = query.ilike('title', `%${title}%`);
        }

        // 分页
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        // 排序：按创建时间倒序
        query = query.order('created_at', { ascending: false });

        const { data: meets, error, count } = await query;

        if (error) {
            throw new Error(`Failed to fetch meets: ${error.message}`);
        }

        // 处理返回数据，将 host 信息扁平化
        const meetsWithHost = (meets || []).map((meet: any) => {
            const { host, ...meetData } = meet;
            return {
                ...meetData,
                hostName: host?.name || host?.email || '未知用户',
            };
        });

        const response: ApiResponse<{
            meets: (Meet & { hostName?: string | null })[];
            total: number;
            page: number;
            limit: number;
        }> = {
            success: true,
            data: {
                meets: meetsWithHost as (Meet & { hostName?: string | null })[],
                total: count || 0,
                page,
                limit,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in GET /api/meets:', error);
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

// POST /api/meets - 创建会议
export async function POST(request: NextRequest) {
    try {
        const body: CreateMeetRequest = await request.json();
        const { title, description, startTime, duration, hostId } = body;

        // 验证
        if (!title || !hostId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'Title and hostId are required',
                },
                { status: 400 }
            );
        }

        // 生成唯一的会议号（9位数字，按 3-3-3 分组，如：100 083 426）
        const generateNumericMeetingCode = () => {
            // 生成 9 位随机数字字符串（首位不为 0）
            const num = Math.floor(100000000 + Math.random() * 900000000); // [100000000, 999999999]
            const s = num.toString(); // 长度固定为 9
            return `${s.slice(0, 3)}${s.slice(3, 6)}${s.slice(6, 9)}`;
        };

        let meetingCode: string = '';
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isUnique && attempts < maxAttempts) {
            meetingCode = generateNumericMeetingCode();

            // 检查会议号是否已存在
            const { data: existingMeet } = await supabaseAdmin
                .from('meets')
                .select('id')
                .eq('meeting_code', meetingCode)
                .limit(1);

            if (!existingMeet || existingMeet.length === 0) {
                isUnique = true;
            } else {
                attempts++;
            }
        }

        if (!isUnique || !meetingCode) {
            throw new Error('Failed to generate unique meeting code');
        }

        const joinUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://talent-sync-ai-orcin.vercel.app/'}/meet/${meetingCode}`;
        const now = new Date().toISOString();

        const { data: newMeet, error } = await supabaseAdmin
            .from('meets')
            .insert({
                meeting_code: meetingCode,
                title,
                description: description || null,
                host_id: hostId,// hostId,
                start_time: startTime || null,
                duration: duration || null,
                status: 'pending',
                join_url: joinUrl,
                created_at: now,
                updated_at: now,
                ended_at: null,
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create meet: ${error.message}`);
        }

        const response: ApiResponse<Meet> = {
            success: true,
            data: newMeet as Meet,
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error('Error in POST /api/meets:', error);
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
