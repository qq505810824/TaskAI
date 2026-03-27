import { supabaseAdmin } from '@/lib/supabase';
import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership } from '@/lib/taskai/permissions';
import { NextRequest, NextResponse } from 'next/server';

/** GET /api/taskai/leaderboard?orgId=... */
export async function GET(request: NextRequest) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const orgId = request.nextUrl.searchParams.get('orgId');
    if (!orgId) {
        return NextResponse.json({ success: false, message: 'orgId required' }, { status: 400 });
    }

    try {
        const membership = await getActiveMembership(auth.userId, orgId);
        if (!membership) {
            return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
        }

        const { data: rows, error } = await supabaseAdmin
            .from('organization_memberships')
            .select('id, user_id, role, points_balance, points_earned_total')
            .eq('org_id', orgId)
            .eq('status', 'active')
            .order('points_earned_total', { ascending: false })
            .order('updated_at', { ascending: true });

        if (error) throw error;

        const list = rows || [];
        const userIds = [...new Set(list.map((r) => r.user_id))];
        let userMap = new Map<string, { id: string; name: string | null; email: string | null, avatar_url: string | null }>();
        if (userIds.length) {
            const { data: users, error: uErr } = await supabaseAdmin
                .from('users')
                .select('id, name, email, avatar_url')
                .in('id', userIds);
            if (uErr) throw uErr;
            userMap = new Map((users || []).map((u) => [u.id, u]));
        }

        const leaderboard = list.map((r, index) => ({
            rank: index + 1,
            user_id: r.user_id,
            role: r.role,
            points_balance: r.points_balance,
            points_earned_total: r.points_earned_total,
            user: userMap.get(r.user_id) ?? { id: r.user_id, name: null, email: null, avatar_url: null },
            is_me: r.user_id === auth.userId,
        }));

        return NextResponse.json({ success: true, data: { leaderboard } });
    } catch (e) {
        console.error('GET /api/taskai/leaderboard', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_fetch_leaderboard_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
