import { supabaseAdmin } from '@/lib/supabase';

export async function getActiveMembership(userId: string, orgId: string) {
    const { data, error } = await supabaseAdmin
        .from('organization_memberships')
        .select('id, org_id, user_id, role, status, points_balance, points_earned_total')
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data as
        | {
              id: string;
              org_id: string;
              user_id: string;
              role: string;
              status: string;
              points_balance: number;
              points_earned_total: number;
          }
        | null;
}

export async function memberCanSeeTask(userId: string, orgId: string, taskId: string): Promise<boolean> {
    const { data: links, error: linkErr } = await supabaseAdmin
        .from('task_visible_groups')
        .select('group_id')
        .eq('task_id', taskId);

    if (linkErr) throw new Error(linkErr.message);
    if (!links?.length) return true;

    const groupIds = links.map((l) => l.group_id);
    const { data: gm, error: gmErr } = await supabaseAdmin
        .from('group_memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .in('group_id', groupIds)
        .limit(1);

    if (gmErr) throw new Error(gmErr.message);
    return (gm?.length ?? 0) > 0;
}

export async function upsertProfileFromUsersTable(userId: string) {
    const { data: u, error } = await supabaseAdmin.from('users').select('name').eq('id', userId).maybeSingle();
    if (error) throw new Error(error.message);
    const displayName = u?.name ?? null;
    await supabaseAdmin.from('profiles').upsert(
        {
            id: userId,
            display_name: displayName,
            updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
    );
}
