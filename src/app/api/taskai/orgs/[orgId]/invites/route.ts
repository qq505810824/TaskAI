import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership } from '@/lib/taskai/permissions';
import { publicOriginFromRequest } from '@/lib/taskai/public-origin';
import { supabaseAdmin } from '@/lib/supabase';
import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

function newInviteCode(): string {
    return randomBytes(16).toString('hex');
}

/** GET /api/taskai/orgs/[orgId]/invites — Owner 查看邀请链接 */
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
        const { data: invites, error } = await supabaseAdmin
            .from('invite_links')
            .select('id, code, status, expires_at, max_uses, used_count, created_at')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const origin = publicOriginFromRequest(request);
        const withUrls = (invites || []).map((inv) => ({
            ...inv,
            invite_url: `${origin}/taskai/join?code=${encodeURIComponent(inv.code)}`,
        }));

        return NextResponse.json({ success: true, data: { invites: withUrls } });
    } catch (e) {
        console.error('GET /api/taskai/orgs/[orgId]/invites', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_list_invites_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

type PostInviteBody = {
    expiresInDays?: number | null;
    maxUses?: number | null;
};

/** POST /api/taskai/orgs/[orgId]/invites — Owner 新建邀请链接 */
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

    let body: PostInviteBody = {};
    try {
        body = (await request.json()) as PostInviteBody;
    } catch {
        /* */
    }

    const now = new Date();
    const expiresAt =
        body.expiresInDays != null && body.expiresInDays > 0
            ? new Date(now.getTime() + body.expiresInDays * 86400000).toISOString()
            : null;

    const maxUses =
        body.maxUses != null && body.maxUses > 0 ? Math.floor(body.maxUses) : null;

    try {
        let code = newInviteCode();
        let attempts = 0;
        let row: Record<string, unknown> | null = null;

        while (attempts < 5) {
            const { data, error } = await supabaseAdmin
                .from('invite_links')
                .insert({
                    org_id: orgId,
                    code,
                    status: 'active',
                    expires_at: expiresAt,
                    max_uses: maxUses,
                    created_by: auth.userId,
                    created_at: now.toISOString(),
                    updated_at: now.toISOString(),
                })
                .select('id, code, status, expires_at, max_uses, used_count, created_at')
                .single();

            if (!error && data) {
                row = data;
                break;
            }
            if (error?.message?.includes('duplicate') || error?.code === '23505') {
                code = newInviteCode();
                attempts += 1;
                continue;
            }
            throw error;
        }

        if (!row) {
            return NextResponse.json(
                { success: false, error: 'invite_create_failed', message: 'Could not generate unique code' },
                { status: 500 }
            );
        }

        const origin = publicOriginFromRequest(request);
        const invite_url = `${origin}/taskai/join?code=${encodeURIComponent(String(row.code))}`;

        return NextResponse.json(
            {
                success: true,
                data: {
                    invite: { ...row, invite_url },
                },
            },
            { status: 201 }
        );
    } catch (e) {
        console.error('POST /api/taskai/orgs/[orgId]/invites', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_create_invite_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
