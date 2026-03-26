import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse, IdentifyUserRequest, PlatformInfo } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/users/identify - 识别或创建用户（用于 Telegram/WhatsApp 平台）
export async function POST(request: NextRequest) {
    try {
        const body: IdentifyUserRequest = await request.json();
        const { platform, platformUserId, platformUsername, platformDisplayName } = body;

        if (!platform || !platformUserId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'Platform and platformUserId are required',
                },
                { status: 400 }
            );
        }

        // 只处理 telegram 和 whatsapp 平台
        if (platform !== 'telegram' && platform !== 'whatsapp') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'This endpoint only supports telegram and whatsapp platforms. Use /api/users/current for web platform.',
                },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();

        // 在 Supabase users 表中查找现有用户（在 meta.platform 中查找匹配的平台信息）
        const { data: existingUsers, error: searchError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq("meta->'platform'->>'platform'", platform)
            .eq("meta->'platform'->>'platform_user_id'", platformUserId)
            .limit(1);

        if (searchError) {
            console.error('Error searching for user:', searchError);
            throw new Error(`Failed to search for user: ${searchError.message}`);
        }

        let user;
        let isNewUser = false;

        if (existingUsers && existingUsers.length > 0) {
            // 用户已存在，更新平台信息（如果有新信息）
            user = existingUsers[0];
            const currentMeta = (user.meta as any)?.platform || {};

            const updatedPlatformInfo: PlatformInfo = {
                platform,
                platform_user_id: platformUserId,
                platform_username: platformUsername || currentMeta.platform_username || null,
                platform_display_name: platformDisplayName || currentMeta.platform_display_name || null,
                created_at: currentMeta.created_at || now,
            };

            // 更新用户信息
            const updateData: any = {
                updated_at: now,
                meta: {
                    platform: updatedPlatformInfo,
                },
            };

            // 更新用户名称（如果提供了新的显示名称）
            if (platformDisplayName && !user.name) {
                updateData.name = platformDisplayName;
            }

            const { data: updatedUser, error: updateError } = await supabaseAdmin
                .from('users')
                .update(updateData)
                .eq('id', user.id)
                .select()
                .single();

            if (updateError) {
                throw new Error(`Failed to update user: ${updateError.message}`);
            }

            user = updatedUser;
        } else {
            // 创建新用户
            isNewUser = true;
            const newPlatformInfo: PlatformInfo = {
                platform,
                platform_user_id: platformUserId,
                platform_username: platformUsername || null,
                platform_display_name: platformDisplayName || null,
                created_at: now,
            };

            const { data: newUser, error: insertError } = await supabaseAdmin
                .from('users')
                .insert({
                    // 不传递 id，让数据库自动生成 UUID
                    email: null,
                    name: platformDisplayName || platformUsername || '用户',
                    role: 'user',
                    avatar_url: null,
                    meta: {
                        platform: newPlatformInfo,
                    },
                    created_at: now,
                    updated_at: now,
                })
                .select()
                .single();

            if (insertError) {
                throw new Error(`Failed to create user: ${insertError.message}`);
            }

            user = newUser;
        }

        const response: ApiResponse<{
            id: string;
            name: string | null;
            meta: {
                platform: PlatformInfo;
            };
            isNewUser: boolean;
        }> = {
            success: true,
            data: {
                id: user.id,
                name: user.name,
                meta: user.meta as any,
                isNewUser,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in POST /api/users/identify:', error);
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
