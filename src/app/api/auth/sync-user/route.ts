import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth/sync-user - 将 Supabase Auth 用户同步到自定义 users 表
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { authUserId, email, name } = body as {
            authUserId: string;
            email: string | null;
            name: string;
        };

        if (!authUserId || !email) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'authUserId and email are required',
                },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();

        const platformInfo = {
            platform: 'web',
            platform_user_id: authUserId,
            platform_username: null,
            platform_display_name: name || null,
            created_at: now,
        };

        const { data, error } = await supabaseAdmin
            .from('users')
            .upsert(
                {
                    id: authUserId,
                    email,
                    name: name || null,
                    role: 'user',
                    meta: { platform: platformInfo },
                    created_at: now,
                    updated_at: now,
                },
                { onConflict: 'id' }
            )
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        const response: ApiResponse<any> = {
            success: true,
            data,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in POST /api/auth/sync-user:', error);
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