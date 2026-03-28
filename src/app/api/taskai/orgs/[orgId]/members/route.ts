import { supabaseAdmin } from '@/lib/supabase';
import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership } from '@/lib/taskai/permissions';
import { NextRequest, NextResponse } from 'next/server';

/** GET /api/taskai/orgs/[orgId]/members */
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
        const { data: rows, error } = await supabaseAdmin
            .from('organization_memberships')
            .select('id, user_id, role, status, joined_at, points_balance, points_earned_total')
            .eq('org_id', orgId)
            .in('status', ['active', 'invited'])
            .order('joined_at', { ascending: true });

        if (error) throw error;

        const list = rows || [];
        const userIds = [...new Set(list.map((r) => r.user_id))];
        let userMap = new Map<string, { id: string; name: string | null; email: string | null; avatar_url: string | null }>();
        if (userIds.length) {
            const { data: users, error: uErr } = await supabaseAdmin
                .from('users')
                .select('id, name, email, avatar_url')
                .in('id', userIds);
            if (uErr) throw uErr;
            userMap = new Map((users || []).map((u) => [u.id, u]));
        }

        const members = list.map((r) => ({
            ...r,
            user: userMap.get(r.user_id) ?? { id: r.user_id, name: null, email: null, avatar_url: null },
        }));

        return NextResponse.json({ success: true, data: { members } });
    } catch (e) {
        console.error('GET /api/taskai/orgs/[orgId]/members', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_list_members_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

type PostMemberBody = {
    email?: string;
};

/** POST /api/taskai/orgs/[orgId]/members — 通过已注册邮箱添加成员 */
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

    let body: PostMemberBody = {};
    try {
        body = (await request.json()) as PostMemberBody;
    } catch {
        /* */
    }

    const raw = body.email?.trim();
    if (!raw) {
        return NextResponse.json(
            { success: false, error: 'validation', message: 'email is required' },
            { status: 400 }
        );
    }

    const normalized = raw.toLowerCase();

    try {
        let userRow: { id: string; email?: string | null } | null = null;
        const { data: exact, error: e1 } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('email', raw)
            .maybeSingle();
        if (e1) throw e1;
        userRow = exact;
        if (!userRow?.id && normalized !== raw) {
            const { data: exactLo, error: e2 } = await supabaseAdmin
                .from('users')
                .select('id, email')
                .eq('email', normalized)
                .maybeSingle();
            if (e2) throw e2;
            userRow = exactLo;
        }

        if (!userRow?.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'user_not_found',
                    message: 'Email not found, please ask the user to register or join via invitation link',
                },
                { status: 404 }
            );
        }

        if (userRow.id === auth.userId) {
            return NextResponse.json(
                { success: false, error: 'validation', message: 'Cannot add yourself' },
                { status: 400 }
            );
        }

        const { data: existing, error: exErr } = await supabaseAdmin
            .from('organization_memberships')
            .select('id, status')
            .eq('org_id', orgId)
            .eq('user_id', userRow.id)
            .maybeSingle();

        if (exErr) throw exErr;

        const now = new Date().toISOString();

        if (existing) {
            if (existing.status === 'active') {
                return NextResponse.json(
                    { success: false, error: 'already_member', message: 'User is already a member' },
                    { status: 409 }
                );
            }
            const { error: upErr } = await supabaseAdmin
                .from('organization_memberships')
                .update({
                    status: 'active',
                    role: 'member',
                    updated_at: now,
                })
                .eq('id', existing.id);
            if (upErr) throw upErr;
            return NextResponse.json({ success: true, data: { reactivated: true, userId: userRow.id } });
        }

        const { error: insErr } = await supabaseAdmin.from('organization_memberships').insert({
            org_id: orgId,
            user_id: userRow.id,
            role: 'member',
            status: 'active',
            created_at: now,
            updated_at: now,
        });

        if (insErr) throw insErr;

        return NextResponse.json({ success: true, data: { userId: userRow.id } }, { status: 201 });
    } catch (e) {
        console.error('POST /api/taskai/orgs/[orgId]/members', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_add_member_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
