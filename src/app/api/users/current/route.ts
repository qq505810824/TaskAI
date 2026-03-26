import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse } from '@/types/meeting';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/users/current - 获取当前登录用户（Web平台）
export async function GET(request: NextRequest) {
    try {
        // 从请求头获取 Authorization token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized',
                    message: 'Missing or invalid authorization token',
                },
                { status: 401 }
            );
        }

        const token = authHeader.replace('Bearer ', '');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Missing Supabase environment variables');
        }

        // 使用 token 创建 Supabase 客户端
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        });

        // 获取当前用户
        const {
            data: { user: authUser },
            error: authError,
        } = await supabaseClient.auth.getUser();

        if (authError || !authUser) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized',
                    message: 'Invalid or expired token',
                },
                { status: 401 }
            );
        }

        // 从 users 表获取用户信息
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

        if (userError) {
            // 如果用户不存在，返回 Auth 用户的基本信息
            const username =
                (authUser.user_metadata as any)?.username ||
                (authUser.email ? authUser.email.split('@')[0] : '用户');

            const response: ApiResponse<{
                id: string;
                name: string | null;
                email: string | null;
                role: string;
                avatar_url: string | null;
                meta: {
                    platform: {
                        platform: string;
                        platform_user_id: string;
                        platform_username: string | null;
                        platform_display_name: string | null;
                        created_at: string;
                    };
                };
                createdAt: string;
                updatedAt: string;
            }> = {
                success: true,
                data: {
                    id: authUser.id,
                    name: username,
                    email: authUser.email || null,
                    role: 'user',
                    avatar_url: null,
                    meta: {
                        platform: {
                            platform: 'web',
                            platform_user_id: authUser.id,
                            platform_username: null,
                            platform_display_name: username,
                            created_at: authUser.created_at,
                        },
                    },
                    createdAt: authUser.created_at,
                    updatedAt: authUser.updated_at || authUser.created_at,
                },
            };

            return NextResponse.json(response);
        }

        const response: ApiResponse<{
            id: string;
            name: string | null;
            email: string | null;
            role: string;
            avatar_url: string | null;
            meta: {
                platform: {
                    platform: string;
                    platform_user_id: string;
                    platform_username: string | null;
                    platform_display_name: string | null;
                    created_at: string;
                };
            };
            createdAt: string;
            updatedAt: string;
        }> = {
            success: true,
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar_url: user.avatar_url,
                meta: user.meta as any,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in GET /api/users/current:', error);
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
