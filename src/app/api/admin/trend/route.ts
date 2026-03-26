
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return {
                date: d.toISOString().split('T')[0],
                name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
                interviews: 0,
                tasks: 0
            };
        });

        const startDate = last7Days[0].date;

        // Fetch meets and todos for the last 7 days
        const [meetsRes, todosRes] = await Promise.all([
            supabaseAdmin
                .from('user_meets')
                .select('joined_at')
                .eq('status', 'completed')
                .gte('joined_at', startDate),
            supabaseAdmin
                .from('todos')
                .select('created_at')
                .gte('created_at', startDate)
        ]);

        meetsRes.data?.forEach(m => {
            const date = new Date(m.joined_at).toISOString().split('T')[0];
            const point = last7Days.find(p => p.date === date);
            if (point) point.interviews++;
        });

        todosRes.data?.forEach(t => {
            const date = new Date(t.created_at).toISOString().split('T')[0];
            const point = last7Days.find(p => p.date === date);
            if (point) point.tasks++;
        });

        return NextResponse.json({
            success: true,
            data: last7Days.map(({ name, interviews, tasks }) => ({ name, interviews, tasks }))
        });
    } catch (error) {
        console.error('Admin trend API error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
