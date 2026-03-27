import { getActiveMembership, memberCanSeeTask } from '@/lib/taskai/permissions';
import { supabaseAdmin } from '@/lib/supabase';

export type TaskAccessResult =
    | {
          ok: true;
          task: {
              id: string;
              org_id: string;
              assignee_user_id: string | null;
              title: string;
              description: string | null;
          };
          role: string;
      }
    | { ok: false; status: number; message: string };

/** 验证用户是否可访问 task（owner 全量；member 需满足可见性） */
export async function requireTaskAccess(userId: string, taskId: string): Promise<TaskAccessResult> {
    const { data: task, error: taskErr } = await supabaseAdmin
        .from('tasks')
        .select('id, org_id, assignee_user_id, title, description')
        .eq('id', taskId)
        .maybeSingle();

    if (taskErr) throw taskErr;
    if (!task) return { ok: false, status: 404, message: 'task not found' };

    const membership = await getActiveMembership(userId, task.org_id);
    if (!membership) return { ok: false, status: 403, message: 'forbidden' };

    if (membership.role === 'member') {
        const canSee = await memberCanSeeTask(userId, task.org_id, taskId);
        if (!canSee) return { ok: false, status: 403, message: 'forbidden' };
    }

    return {
        ok: true,
        task: {
            id: task.id,
            org_id: task.org_id,
            assignee_user_id: task.assignee_user_id,
            title: task.title,
            description: task.description,
        },
        role: membership.role,
    };
}
