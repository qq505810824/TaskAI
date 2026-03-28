import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership } from '@/lib/taskai/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/** GET /api/taskai/orgs/[orgId]/invites — Owner 查看组织邀请码（存于 organizations.invite_code） */
export async function GET(request: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { orgId } = await ctx.params;
    if (!orgId) {
        return NextResponse.json({ success: false, message: 'orgId required' }, { status: 400 });
    }

    const membership = await getActiveMembership(auth.userId, orgId);
    if (!membership || membership.role !== 'owner') {
        return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
    }

    try {
        const { data: org, error } = await supabaseAdmin
            .from('organizations')
            .select('id, invite_code')
            .eq('id', orgId)
            .single();

        if (error) throw error;

        const code = org?.invite_code ? String(org.invite_code).trim() : '';
        const invite =
            code && /^\d{9}$/.test(code)
                ? {
                      id: org.id,
                      code,
                      status: 'active',
                      used_count: 0,
                  }
                : null;

        return NextResponse.json({ success: true, data: { invite } });
    } catch (e) {
        console.error('GET /api/taskai/orgs/[orgId]/invites', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_get_invite_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/taskai/orgs/[orgId]/invites — 重新生成邀请码（已暂停：创建组织时已自动生成 invite_code）
 * TODO: 后续如需轮换码，可更新 organizations.invite_code 并处理旧码兼容
 */
/** 重新生成邀请码已暂停；历史实现见 git（原 invite_links 轮换 POST 逻辑）。 */
export async function POST() {
    return NextResponse.json(
        {
            success: false,
            error: 'invite_regenerate_disabled',
            message: 'Regenerating invite codes is temporarily disabled. Use the code assigned when the team was created.',
        },
        { status: 410 }
    );
}
