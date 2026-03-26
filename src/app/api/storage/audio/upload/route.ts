import { supabaseAdmin } from '@/lib/supabase';
import type { ApiResponse } from '@/types/meeting';
import { NextRequest, NextResponse } from 'next/server';

const AUDIO_BUCKET = process.env.SUPABASE_STORAGE_AUDIO_BUCKET?.trim() || 'conversation-audio';

function sanitizePathPart(value: string) {
    return value.replace(/[^a-zA-Z0-9-_]/g, '_');
}

// POST /api/storage/audio/upload
// multipart/form-data:
// - file: Blob/File
// - meetId: string
// - userId: string
// - conversationId: string
// - userMeetId?: string
export async function POST(request: NextRequest) {
    try {
        const form = await request.formData();
        const file = form.get('file');
        const meetId = String(form.get('meetId') || '').trim();
        const userId = String(form.get('userId') || '').trim();
        const conversationId = String(form.get('conversationId') || '').trim();
        const userMeetIdRaw = String(form.get('userMeetId') || '').trim();

        if (!(file instanceof Blob)) {
            return NextResponse.json(
                { success: false, error: 'Validation error', message: 'file is required' },
                { status: 400 }
            );
        }
        if (!meetId || !userId || !conversationId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation error',
                    message: 'meetId, userId and conversationId are required',
                },
                { status: 400 }
            );
        }
        if (file.size < 1024) {
            return NextResponse.json(
                { success: false, error: 'Validation error', message: 'audio file is too small' },
                { status: 400 }
            );
        }

        const safeMeetId = sanitizePathPart(meetId);
        const safeUserId = sanitizePathPart(userId);
        const safeUserMeetId = sanitizePathPart(userMeetIdRaw || 'none');
        const safeConvId = sanitizePathPart(conversationId);
        const ext = file.type.includes('wav') ? 'wav' : file.type.includes('webm') ? 'webm' : 'bin';
        // 固定 key：同一会话重复上传会覆盖，避免重复对象
        const filePath = `rtc/user-audio/${safeMeetId}/${safeUserMeetId}/${safeUserId}/${safeConvId}.${ext}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from(AUDIO_BUCKET)
            .upload(filePath, file, {
                contentType: file.type || 'application/octet-stream',
                upsert: true,
            });

        if (uploadError) {
            throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        const { data: publicData } = supabaseAdmin.storage.from(AUDIO_BUCKET).getPublicUrl(filePath);
        const publicUrl = publicData?.publicUrl ?? '';

        const response: ApiResponse<{ url: string; path: string; bucket: string }> = {
            success: true,
            data: {
                url: publicUrl,
                path: filePath,
                bucket: AUDIO_BUCKET,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in POST /api/storage/audio/upload:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

