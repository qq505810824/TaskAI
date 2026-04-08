import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperadminUser } from '@/lib/taskai/api-auth'
import { NextRequest, NextResponse } from 'next/server'

type AllowedRole = 'admin' | 'user'

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    const superadminResult = await requireSuperadminUser(request)
    if (!superadminResult.ok) {
        return superadminResult.response
    }

    const { userId } = await context.params
    const body = (await request.json()) as { role?: AllowedRole; password?: string; isActive?: boolean }
    const role = body.role
    const password = typeof body.password === 'string' ? body.password.trim() : ''
    const hasIsActiveUpdate = Object.prototype.hasOwnProperty.call(body, 'isActive')

    if (role !== undefined && role !== 'admin' && role !== 'user') {
        return NextResponse.json(
            { success: false, error: 'Validation', message: 'role must be admin or user' },
            { status: 400 }
        )
    }

    if (role === undefined && !password && !hasIsActiveUpdate) {
        return NextResponse.json(
            { success: false, error: 'Validation', message: 'Nothing to update' },
            { status: 400 }
        )
    }

    if (password && password.length < 8) {
        return NextResponse.json(
            { success: false, error: 'Validation', message: 'Password must be at least 8 characters' },
            { status: 400 }
        )
    }

    const { data: existingUser, error: existingUserError } = await supabaseAdmin
        .from('users')
        .select('id, meta')
        .eq('id', userId)
        .maybeSingle()

    if (existingUserError) {
        return NextResponse.json(
            { success: false, error: 'Internal', message: existingUserError.message },
            { status: 500 }
        )
    }

    if (!existingUser) {
        return NextResponse.json(
            { success: false, error: 'Not Found', message: 'User not found' },
            { status: 404 }
        )
    }

    const currentMeta =
        (existingUser.meta as { superadmin?: { is_active?: boolean; deactivated_at?: string | null } } | null) ?? {}

    if (hasIsActiveUpdate) {
        const isActive = Boolean(body.isActive)
        const { data, error } = await supabaseAdmin
            .from('users')
            .update({
                meta: {
                    ...currentMeta,
                    superadmin: {
                        ...(currentMeta.superadmin ?? {}),
                        is_active: isActive,
                        deactivated_at: isActive ? null : new Date().toISOString(),
                    },
                },
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select('id, name, email, role, avatar_url, created_at, updated_at, meta')
            .single()

        if (error) {
            return NextResponse.json(
                { success: false, error: 'Internal', message: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            data,
        })
    }

    if (password) {
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password,
        })

        if (passwordError) {
            return NextResponse.json(
                { success: false, error: 'Internal', message: passwordError.message },
                { status: 500 }
            )
        }
    }

    let data = null
    let error = null

    if (role !== undefined) {
        const updateResult = await supabaseAdmin
            .from('users')
            .update({
                role,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .select('id, name, email, role, avatar_url, created_at, updated_at')
            .single()

        data = updateResult.data
        error = updateResult.error
    } else {
        const fetchResult = await supabaseAdmin
            .from('users')
            .select('id, name, email, role, avatar_url, created_at, updated_at')
            .eq('id', userId)
            .single()

        data = fetchResult.data
        error = fetchResult.error
    }

    if (error) {
        return NextResponse.json(
            { success: false, error: 'Internal', message: error.message },
            { status: 500 }
        )
    }

    return NextResponse.json({
        success: true,
        data,
    })
}
