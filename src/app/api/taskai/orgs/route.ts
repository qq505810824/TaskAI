import { requireAuthUser } from '@/lib/taskai/api-auth';
import { upsertProfileFromUsersTable } from '@/lib/taskai/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

type CreateOrgBody = {
    name?: string;
    description?: string | null;
};

/** POST /api/taskai/orgs — 创建组织并成为 Owner */
export async function POST(request: NextRequest) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    let body: CreateOrgBody = {};
    try {
        body = (await request.json()) as CreateOrgBody;
    } catch {
        /* empty */
    }

    const name = body.name?.trim();
    if (!name) {
        return NextResponse.json(
            { success: false, error: 'validation', message: 'name is required' },
            { status: 400 }
        );
    }

    try {
        try {
            await upsertProfileFromUsersTable(auth.userId);
        } catch {
            /* profiles 表可能尚未迁移，忽略 */
        }

        const now = new Date().toISOString();
        const { data: org, error: orgErr } = await supabaseAdmin
            .from('organizations')
            .insert({
                name,
                description: body.description ?? null,
                created_by: auth.userId,
                created_at: now,
                updated_at: now,
            })
            .select('id, name, description, points_pool_total, points_pool_remaining, created_at')
            .single();

        if (orgErr) throw orgErr;

        const { error: memErr } = await supabaseAdmin.from('organization_memberships').insert({
            org_id: org.id,
            user_id: auth.userId,
            role: 'owner',
            status: 'active',
            created_at: now,
            updated_at: now,
        });

        if (memErr) throw memErr;

        return NextResponse.json(
            {
                success: true,
                data: { organization: org },
            },
            { status: 201 }
        );
    } catch (e) {
        console.error('POST /api/taskai/orgs', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_org_create_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
