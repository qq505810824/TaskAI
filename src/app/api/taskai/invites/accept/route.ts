import { supabaseAdmin } from '@/lib/supabase';
import { requireAuthUser } from '@/lib/taskai/api-auth';
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

    const code = body.code?.trim().replace(/\s/g, '');
    if (!code) {
        return NextResponse.json(
            { success: false, error: 'validation', message: 'code is required' },
            { status: 400 }
        );
    }
    if (!/^\d{9}$/.test(code)) {
        return NextResponse.json(
            { success: false, error: 'validation', message: '邀请码必须是9位数字' },
            { status: 400 }
        );
    }

    try {
        const now = new Date().toISOString();

        const { data: orgByCode, error: orgCodeErr } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('invite_code', code)
            .maybeSingle();

        if (orgCodeErr) throw orgCodeErr;

        let orgId: string | null = orgByCode?.id ?? null;
        let inviteLinkRow: {
            id: string;
            org_id: string;
            status: string;
            expires_at: string | null;
            max_uses: number | null;
            used_count: number;
        } | null = null;

        if (!orgId) {
            const { data: invite, error: invErr } = await supabaseAdmin
                .from('invite_links')
                .select('*')
                .eq('code', code)
                .maybeSingle();

            if (invErr) throw invErr;
            if (!invite) {
                return NextResponse.json(
                    { success: false, error: 'invalid_code', message: 'Invalid invitation code' },
                    { status: 404 }
                );
            }

            if (invite.status !== 'active') {
                return NextResponse.json(
                    { success: false, error: 'invite_inactive', message: 'Invitation has been revoked or is no longer available' },
                    { status: 400 }
                );
            }

            if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
                return NextResponse.json(
                    { success: false, error: 'invite_expired', message: 'Invitation has expired' },
                    { status: 400 }
                );
            }

            if (invite.max_uses != null && Number(invite.used_count) >= Number(invite.max_uses)) {
                return NextResponse.json(
                    { success: false, error: 'invite_exhausted', message: 'Invitation has been used up' },
                    { status: 400 }
                );
            }

            orgId = invite.org_id as string;
            inviteLinkRow = {
                id: invite.id as string,
                org_id: invite.org_id as string,
                status: invite.status as string,
                expires_at: (invite.expires_at as string | null) ?? null,
                max_uses: (invite.max_uses as number | null) ?? null,
                used_count: Number(invite.used_count),
            };
        }

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

        if (inviteLinkRow) {
            const nextUsed = inviteLinkRow.used_count + 1;
            const { error: cntErr } = await supabaseAdmin
                .from('invite_links')
                .update({
                    used_count: nextUsed,
                    updated_at: now,
                })
                .eq('id', inviteLinkRow.id);

            if (cntErr) throw cntErr;
        }

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
