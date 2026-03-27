import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership } from '@/lib/taskai/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/** DELETE /api/taskai/orgs/[orgId]/members/[membershipId] - Owner 移除成员 */
export async function DELETE(
    request: NextRequest,
    ctx: { params: Promise<{ orgId: string; membershipId: string }> }
) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const { orgId, membershipId } = await ctx.params;
    if (!orgId || !membershipId) {
        return NextResponse.json({ success: false, message: 'orgId and membershipId required' }, { status: 400 });
    }

    const ownerMembership = await getActiveMembership(auth.userId, orgId);
    if (!ownerMembership || ownerMembership.role !== 'owner') {
        return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
    }

    try {
        const { data: target, error: tErr } = await supabaseAdmin
            .from('organization_memberships')
            .select('id, org_id, user_id, role, status')
            .eq('id', membershipId)
            .eq('org_id', orgId)
            .maybeSingle();

        if (tErr) throw tErr;
        if (!target) {
            return NextResponse.json({ success: false, error: 'not_found', message: 'member not found' }, { status: 404 });
        }

        if (target.role === 'owner') {
            return NextResponse.json(
                { success: false, error: 'validation', message: 'owner cannot be removed here' },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();
        const { error: upErr } = await supabaseAdmin
            .from('organization_memberships')
            .update({ status: 'removed', updated_at: now })
            .eq('id', membershipId);

        if (upErr) throw upErr;

        return NextResponse.json({ success: true, data: { removed: true, membershipId } });
    } catch (e) {
        console.error('DELETE /api/taskai/orgs/[orgId]/members/[membershipId]', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_remove_member_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
