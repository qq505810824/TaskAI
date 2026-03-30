import { DELETE as deleteProject } from '@/app/api/taskai/orgs/[orgId]/projects/[projectId]/route'
import type { NextRequest } from 'next/server'

export async function DELETE(
    request: NextRequest,
    ctx: { params: Promise<{ orgId: string; objectiveId: string }> }
) {
    const { orgId, objectiveId } = await ctx.params
    return deleteProject(request, {
        params: Promise.resolve({ orgId, projectId: objectiveId }),
    })
}
