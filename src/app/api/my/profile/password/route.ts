import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/my/profile/password - 修改密码 (校验原密码并修改)
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON!;

        // 验证用户身份并获取当前用户
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !user || !user.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { old_password, new_password } = body;

        if (!old_password || !new_password) {
            return NextResponse.json({ success: false, error: 'Old and new passwords are required' }, { status: 400 });
        }

        // 1. 验证原密码 (通过尝试重新登录)
        const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
            email: user.email,
            password: old_password
        });

        if (signInError) {
            return NextResponse.json({ success: false, error: '原密码不正确' }, { status: 401 });
        }

        // 2. 修改为新密码 (使用 supabaseAdmin 修改)
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: new_password
        });

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error in POST /api/my/profile/password:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
