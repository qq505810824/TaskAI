import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export type AuthUserResult =
    | { ok: true; userId: string; accessToken: string }
    | { ok: false; response: NextResponse };

export type AdminUserResult =
    | { ok: true; userId: string; accessToken: string }
    | { ok: false; response: NextResponse };

export type SuperadminUserResult =
    | { ok: true; userId: string; accessToken: string; email: string }
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

export async function requireAdminUser(request: NextRequest): Promise<AdminUserResult> {
    const authResult = await requireAuthUser(request);
    if (!authResult.ok) {
        return authResult;
    }

    const { data: userRecord, error } = await supabaseAdmin
        .from('users')
        .select('role, meta')
        .eq('id', authResult.userId)
        .maybeSingle();

    if (error) {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, error: 'Internal', message: error.message },
                { status: 500 }
            ),
        };
    }

    const isActive = (userRecord?.meta as { superadmin?: { is_active?: boolean } } | null)?.superadmin?.is_active !== false;
    if (!isActive) {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, error: 'Forbidden', message: 'This account has been deactivated' },
                { status: 403 }
            ),
        };
    }

    if (userRecord?.role !== 'admin') {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, error: 'Forbidden', message: 'Admin access required' },
                { status: 403 }
            ),
        };
    }

    return authResult;
}

export async function requireSuperadminUser(request: NextRequest): Promise<SuperadminUserResult> {
    const authResult = await requireAuthUser(request);
    if (!authResult.ok) {
        return authResult;
    }

    const configuredEmails = (process.env.SUPERADMIN_EMAILS || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

    if (configuredEmails.length === 0) {
        return {
            ok: false,
            response: NextResponse.json(
                {
                    success: false,
                    error: 'Config',
                    message: 'SUPERADMIN_EMAILS is not configured',
                },
                { status: 500 }
            ),
        };
    }

    const { data: userRecord, error } = await supabaseAdmin
        .from('users')
        .select('email, meta')
        .eq('id', authResult.userId)
        .maybeSingle();

    if (error) {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, error: 'Internal', message: error.message },
                { status: 500 }
            ),
        };
    }

    const isActive = (userRecord?.meta as { superadmin?: { is_active?: boolean } } | null)?.superadmin?.is_active !== false;
    if (!isActive) {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, error: 'Forbidden', message: 'This account has been deactivated' },
                { status: 403 }
            ),
        };
    }

    const email = userRecord?.email?.trim().toLowerCase() || '';
    if (!email || !configuredEmails.includes(email)) {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, error: 'Forbidden', message: 'Superadmin access required' },
                { status: 403 }
            ),
        };
    }

    return { ...authResult, email };
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
