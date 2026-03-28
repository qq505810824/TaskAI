import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership } from '@/lib/taskai/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

type PatchOrgBody = {
    name?: string;
    description?: string | null;
};

/** PATCH /api/taskai/orgs/[orgId] — Owner 修改组织名称与描述 */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
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

    let body: PatchOrgBody = {};
    try {
        body = (await request.json()) as PatchOrgBody;
    } catch {
        /* */
    }

    const name = body.name?.trim();
    if (name === undefined && body.description === undefined) {
        return NextResponse.json(
            { success: false, error: 'validation', message: 'name or description required' },
            { status: 400 }
        );
    }

    if (name !== undefined && !name) {
        return NextResponse.json(
            { success: false, error: 'validation', message: 'name cannot be empty' },
            { status: 400 }
        );
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) patch.name = name;
    if (body.description !== undefined) patch.description = body.description;

    try {
        const { data: org, error } = await supabaseAdmin
            .from('organizations')
            .update(patch)
            .eq('id', orgId)
            .select('id, name, description, invite_code, points_pool_total, points_pool_remaining, created_at, updated_at')
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: { organization: org } });
    } catch (e) {
        console.error('PATCH /api/taskai/orgs/[orgId]', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_org_update_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
