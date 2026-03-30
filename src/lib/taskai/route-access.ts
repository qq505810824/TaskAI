import { requireAuthUser } from '@/lib/taskai/api-auth';
import { getActiveMembership } from '@/lib/taskai/permissions';
import { NextRequest, NextResponse } from 'next/server';

export type TaskaiOwnerAccessResult =
    | { ok: true; userId: string; orgId: string }
    | { ok: false; response: NextResponse };

export async function requireTaskaiOwnerAccess(request: NextRequest, orgId: string): Promise<TaskaiOwnerAccessResult> {
    const auth = await requireAuthUser(request);
    if (!auth.ok) {
        return { ok: false, response: auth.response };
    }

    if (!orgId) {
        return {
            ok: false,
            response: NextResponse.json({ success: false, message: 'orgId required' }, { status: 400 }),
        };
    }

    const membership = await getActiveMembership(auth.userId, orgId);
    if (!membership || membership.role !== 'owner') {
        return {
            ok: false,
            response: NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 }),
        };
    }

    return { ok: true, userId: auth.userId, orgId };
}
