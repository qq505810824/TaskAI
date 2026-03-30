import { requireAuthUser } from '@/lib/taskai/api-auth';
import { preloadTaskaiPromptTemplates } from '@/lib/taskai/prompt-templates';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const auth = await requireAuthUser(request);
    if (!auth.ok) return auth.response;

    try {
        const state = await preloadTaskaiPromptTemplates();
        return NextResponse.json({
            success: true,
            data: {
                loadedAt: state.loadedAt,
                promptKeys: state.templates.map((template) => template.prompt_key),
            },
        });
    } catch (e) {
        return NextResponse.json(
            {
                success: false,
                error: 'taskai_prompt_bootstrap_failed',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
