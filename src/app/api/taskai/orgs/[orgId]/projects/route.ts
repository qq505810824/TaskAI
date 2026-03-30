import { requireTaskaiOwnerAccess } from '@/lib/taskai/route-access';
import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

type CreateProjectBody = {
    objective?: string;
    description?: string | null;
    project_name?: string | null;
    status?: 'draft' | 'active' | 'archived';
};

export async function GET(request: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
    const { orgId } = await ctx.params;
    const access = await requireTaskaiOwnerAccess(request, orgId);
    if (!access.ok) return access.response;

    try {
        const { data, error } = await supabaseAdmin
            .from('taskai_projects')
            .select('*')
            .eq('org_id', orgId)
            .order('updated_at', { ascending: false });
        if (error) throw error;

        return NextResponse.json({ success: true, data: { projects: data ?? [] } });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_fetch_projects_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ orgId: string }> }) {
    const { orgId } = await ctx.params;
    const access = await requireTaskaiOwnerAccess(request, orgId);
    if (!access.ok) return access.response;

    let body: CreateProjectBody = {};
    try {
        body = (await request.json()) as CreateProjectBody;
    } catch {
        /* */
    }

    const projectName = body.project_name?.trim();
    if (!projectName) {
        return NextResponse.json({ success: false, message: 'project_name required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('taskai_projects')
            .insert({
                org_id: orgId,
                name: projectName,
                objective: body.objective?.trim() || null,
                description: body.description?.trim() || null,
                status: body.status ?? 'active',
                created_by: access.userId,
            })
            .select('*')
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data: { project: data } }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_create_project_failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
