
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '30');
        const offset = (page - 1) * pageSize;

        // 1. 获取总数
        const { count: total, error: countError } = await supabaseAdmin
            .from('user_meets')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // 2. 获取分页数据
        const { data: userMeets, error } = await supabaseAdmin
            .from('user_meets')
            .select(`
                *,
                user:users(*),
                meet:meets(*)
            `)
            .order('joined_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: {
                userMeets,
                pagination: {
                    total: total || 0,
                    page,
                    pageSize,
                    totalPages: Math.ceil((total || 0) / pageSize)
                }
            }
        });
    } catch (error) {
        console.error('Admin user-meets API error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
