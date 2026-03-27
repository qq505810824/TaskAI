import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership } from '@/lib/taskai/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/** GET /api/taskai/activities?orgId=...&limit=20 */
export async function GET(request: NextRequest) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const orgId = request.nextUrl.searchParams.get('orgId');
    const limitRaw = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Math.max(Number(limitRaw || 20), 1), 50);

    if (!orgId) {
        return NextResponse.json({ success: false, message: 'orgId required' }, { status: 400 });
    }

    try {
        const membership = await getActiveMembership(auth.userId, orgId);
        if (!membership) {
            return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
        }

        const { data: rows, error } = await supabaseAdmin
            .from('activities')
            .select('id, org_id, actor_user_id, event_type, entity_type, entity_id, points_delta, meta, created_at')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        const list = rows || [];
        const actorIds = [...new Set(list.map((r) => r.actor_user_id).filter(Boolean))] as string[];
        let userMap = new Map<string, { id: string; name: string | null }>();
        if (actorIds.length) {
            const { data: users, error: uErr } = await supabaseAdmin
                .from('users')
                .select('id, name')
                .in('id', actorIds);
            if (uErr) throw uErr;
            userMap = new Map((users || []).map((u) => [u.id, u]));
        }

        const activities = list.map((r) => ({
            ...r,
            actor_name: r.actor_user_id ? userMap.get(r.actor_user_id)?.name ?? null : null,
            task_title:
                r.meta && typeof r.meta === 'object' && 'task_title' in r.meta
                    ? String((r.meta as Record<string, unknown>).task_title ?? '')
                    : null,
        }));

        return NextResponse.json({ success: true, data: { activities } });
    } catch (e) {
        console.error('GET /api/taskai/activities', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_fetch_activities_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
