import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership } from '@/lib/taskai/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

function generateNineDigitCode(): string {
    return String(Math.floor(100000000 + Math.random() * 900000000));
}

async function generateUniqueInviteCode(): Promise<string> {
    for (let i = 0; i < 20; i += 1) {
        const code = generateNineDigitCode();
        const { data, error } = await supabaseAdmin
            .from('invite_links')
            .select('id')
            .eq('code', code)
            .maybeSingle();
        if (error) throw error;
        if (!data) return code;
    }
    throw new Error('failed to generate unique 9-digit code');
}

/** GET /api/taskai/orgs/[orgId]/invites — Owner 查看当前邀请码（仅一个） */
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
        const { data: invite, error } = await supabaseAdmin
            .from('invite_links')
            .select('id, code, status, expires_at, max_uses, used_count, created_at, updated_at')
            .eq('org_id', orgId)
            .eq('status', 'active')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        return NextResponse.json({ success: true, data: { invite: invite ?? null } });
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

/** POST /api/taskai/orgs/[orgId]/invites — 生成/重置单一邀请码（9位数字） */
export async function POST(request: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
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
        const now = new Date().toISOString();
        const code = await generateUniqueInviteCode();

        // 先撤销该组织已有激活邀请码（保证只有一个生效码）
        const { error: revokeErr } = await supabaseAdmin
            .from('invite_links')
            .update({ status: 'revoked', updated_at: now })
            .eq('org_id', orgId)
            .eq('status', 'active');
        if (revokeErr) throw revokeErr;

        const { data: invite, error: insErr } = await supabaseAdmin
            .from('invite_links')
            .insert({
                org_id: orgId,
                code,
                status: 'active',
                expires_at: null,
                max_uses: null,
                used_count: 0,
                created_by: auth.userId,
                created_at: now,
                updated_at: now,
            })
            .select('id, code, status, expires_at, max_uses, used_count, created_at, updated_at')
            .single();

        if (insErr) throw insErr;

        return NextResponse.json({ success: true, data: { invite } }, { status: 201 });
    } catch (e) {
        console.error('POST /api/taskai/orgs/[orgId]/invites', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_reset_invite_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
