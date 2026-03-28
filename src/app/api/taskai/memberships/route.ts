import { requireAuthUser } from '@/lib/taskai/api-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/** GET /api/taskai/memberships — 当前用户在所有组织下的成员关系（含组织信息） */
export async function GET(request: NextRequest) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    try {
        const { data, error } = await supabaseAdmin
            .from('organization_memberships')
            .select(
                `
        id,
        org_id,
        role,
        points_balance,
        points_earned_total,
        organizations (
          id,
          name,
          description,
          invite_code,
          points_pool_total,
          points_pool_remaining
        )
      `
            )
            .eq('user_id', auth.userId)
            .eq('status', 'active');

        if (error) throw error;

        const memberships = (data || []).map((row: Record<string, unknown>) => {
            const rawOrg = row.organizations;
            const orgRow = Array.isArray(rawOrg)
                ? (rawOrg[0] as Record<string, unknown> | undefined) ?? null
                : (rawOrg as Record<string, unknown> | null);
            const org = orgRow
                ? {
                      id: orgRow.id,
                      name: orgRow.name,
                      description: orgRow.description,
                      invite_code: (orgRow.invite_code as string | null | undefined) ?? null,
                      points_pool_total: orgRow.points_pool_total,
                      points_pool_remaining: orgRow.points_pool_remaining,
                  }
                : null;
            return {
                id: row.id,
                org_id: row.org_id,
                role: row.role,
                points_balance: row.points_balance,
                points_earned_total: row.points_earned_total,
                organization: org,
            };
        });

        return NextResponse.json({ success: true, data: { memberships } });
    } catch (e) {
        console.error('GET /api/taskai/memberships', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_fetch_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
