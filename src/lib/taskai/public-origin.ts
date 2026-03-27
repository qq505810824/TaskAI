import type { NextRequest } from 'next/server';

/** 生成前端可分享的绝对 URL 前缀（邀请链接等） */
export function publicOriginFromRequest(request: NextRequest): string {
    const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
    if (env) return env;
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') ?? 'http';
    if (host) return `${proto}://${host}`;
    return 'http://localhost:3000';
}
