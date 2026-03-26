
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Fetch stats in parallel
        const [
            { count: sessionsCompleted },
            { count: sessionsInProgress },
            { data: todosData },
            { data: meetsData }
        ] = await Promise.all([
            supabaseAdmin.from('user_meets').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
            supabaseAdmin.from('user_meets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
            supabaseAdmin.from('todos').select('status'),
            supabaseAdmin.from('user_meets').select('joined_at, completed_at').eq('status', 'completed')
        ]);

        const todosTotal = todosData?.length || 0;
        const todosCompleted = todosData?.filter(t => t.status === 'confirmed').length || 0;
        const todosCompletedRate = todosTotal > 0 ? todosCompleted / todosTotal : 0;

        let totalDuration = 0;
        let validMeetsCount = 0;
        meetsData?.forEach(m => {
            if (m.joined_at && m.completed_at) {
                const duration = (new Date(m.completed_at).getTime() - new Date(m.joined_at).getTime()) / (1000 * 60);
                totalDuration += duration;
                validMeetsCount++;
            }
        });
        const avgDuration = validMeetsCount > 0 ? Math.round(totalDuration / validMeetsCount) : 0;

        return NextResponse.json({
            success: true,
            data: {
                sessionsCompleted: sessionsCompleted || 0,
                sessionsInProgress: sessionsInProgress || 0,
                todosTotal,
                todosCompletedRate,
                avgDuration
            }
        });
    } catch (error) {
        console.error('Admin stats API error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
