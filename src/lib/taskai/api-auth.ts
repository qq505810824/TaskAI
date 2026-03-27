import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export type AuthUserResult =
    | { ok: true; userId: string; accessToken: string }
    | { ok: false; response: NextResponse };

export function getBearerToken(request: NextRequest): string | null {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.slice('Bearer '.length).trim() || null;
}

export async function requireAuthUser(request: NextRequest): Promise<AuthUserResult> {
    const token = getBearerToken(request);
    if (!token) {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, error: 'Unauthorized', message: 'Missing Bearer token' },
                { status: 401 }
            ),
        };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON;
    if (!supabaseUrl || !supabaseAnonKey) {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, error: 'Config', message: 'Missing Supabase env' },
                { status: 500 }
            ),
        };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, error: 'Unauthorized', message: 'Invalid or expired token' },
                { status: 401 }
            ),
        };
    }

    return { ok: true, userId: user.id, accessToken: token };
}

/** Supabase client bound to end-user JWT — required for RPC that uses auth.uid(). */
export function createSupabaseForAccessToken(accessToken: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON;
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables');
    }
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
}
