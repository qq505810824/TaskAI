import { requireAuthUser } from '@/lib/taskai/api-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

type Body = {
    code?: string;
};

/** POST /api/taskai/invites/accept — 当前用户通过邀请码加入组织 */
export async function POST(request: NextRequest) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    let body: Body = {};
    try {
        body = (await request.json()) as Body;
    } catch {
        /* */
    }

    const code = body.code?.trim();
    if (!code) {
        return NextResponse.json(
            { success: false, error: 'validation', message: 'code is required' },
            { status: 400 }
        );
    }

    try {
        const { data: invite, error: invErr } = await supabaseAdmin
            .from('invite_links')
            .select('*')
            .eq('code', code)
            .maybeSingle();

        if (invErr) throw invErr;
        if (!invite) {
            return NextResponse.json(
                { success: false, error: 'invalid_code', message: '邀请无效或已失效' },
                { status: 404 }
            );
        }

        if (invite.status !== 'active') {
            return NextResponse.json(
                { success: false, error: 'invite_inactive', message: '邀请已撤销或不可用' },
                { status: 400 }
            );
        }

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            return NextResponse.json(
                { success: false, error: 'invite_expired', message: '邀请已过期' },
                { status: 400 }
            );
        }

        if (
            invite.max_uses != null &&
            Number(invite.used_count) >= Number(invite.max_uses)
        ) {
            return NextResponse.json(
                { success: false, error: 'invite_exhausted', message: '邀请使用次数已用尽' },
                { status: 400 }
            );
        }

        const orgId = invite.org_id as string;
        const now = new Date().toISOString();

        const { data: existing, error: exErr } = await supabaseAdmin
            .from('organization_memberships')
            .select('id, status')
            .eq('org_id', orgId)
            .eq('user_id', auth.userId)
            .maybeSingle();

        if (exErr) throw exErr;

        if (existing) {
            if (existing.status === 'active') {
                return NextResponse.json({
                    success: true,
                    data: { orgId, alreadyMember: true },
                });
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
        } else {
            const { error: insErr } = await supabaseAdmin.from('organization_memberships').insert({
                org_id: orgId,
                user_id: auth.userId,
                role: 'member',
                status: 'active',
                created_at: now,
                updated_at: now,
            });
            if (insErr) throw insErr;
        }

        const nextUsed = Number(invite.used_count) + 1;
        const { error: cntErr } = await supabaseAdmin
            .from('invite_links')
            .update({
                used_count: nextUsed,
                updated_at: now,
            })
            .eq('id', invite.id);

        if (cntErr) throw cntErr;

        return NextResponse.json({
            success: true,
            data: { orgId, alreadyMember: false },
        });
    } catch (e) {
        console.error('POST /api/taskai/invites/accept', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_accept_invite_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
