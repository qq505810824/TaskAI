import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership } from '@/lib/taskai/permissions';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

function ymd(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/** GET /api/taskai/trend?orgId=...&days=7 */
export async function GET(request: NextRequest) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    const orgId = request.nextUrl.searchParams.get('orgId');
    const daysRaw = Number(request.nextUrl.searchParams.get('days') || 7);
    const days = Math.min(Math.max(daysRaw, 3), 30);

    if (!orgId) {
        return NextResponse.json({ success: false, message: 'orgId required' }, { status: 400 });
    }

    try {
        const membership = await getActiveMembership(auth.userId, orgId);
        if (!membership) {
            return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
        }

        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        start.setUTCDate(start.getUTCDate() - (days - 1));

        const { data, error } = await supabaseAdmin
            .from('activities')
            .select('event_type, points_delta, created_at')
            .eq('org_id', orgId)
            .gte('created_at', start.toISOString())
            .in('event_type', ['task_claimed', 'task_completed']);

        if (error) throw error;

        const bucket = new Map<string, { date: string; name: string; claimed: number; completed: number; points: number }>();

        for (let i = 0; i < days; i += 1) {
            const d = new Date(start);
            d.setUTCDate(start.getUTCDate() + i);
            const key = ymd(d);
            bucket.set(key, {
                date: key,
                name: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
                claimed: 0,
                completed: 0,
                points: 0,
            });
        }

        for (const row of data || []) {
            const key = String(row.created_at).slice(0, 10);
            const item = bucket.get(key);
            if (!item) continue;
            if (row.event_type === 'task_claimed') item.claimed += 1;
            if (row.event_type === 'task_completed') {
                item.completed += 1;
                item.points += Number(row.points_delta || 0);
            }
        }

        const trend = [...bucket.values()];
        return NextResponse.json({ success: true, data: { trend } });
    } catch (e) {
        console.error('GET /api/taskai/trend', e);
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_fetch_trend_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
