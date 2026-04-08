import { supabaseAdmin } from '@/lib/supabase'
import { requireSuperadminUser } from '@/lib/taskai/api-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const superadminResult = await requireSuperadminUser(request)
    if (!superadminResult.ok) {
        return superadminResult.response
    }

    const orgId = request.nextUrl.searchParams.get('orgId')?.trim() || null

    const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, name, email, role, avatar_url, meta, created_at, updated_at')
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json(
            { success: false, error: 'Internal', message: error.message },
            { status: 500 }
        )
    }

    const authUsersRes = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (authUsersRes.error) {
        return NextResponse.json(
            { success: false, error: 'Internal', message: authUsersRes.error.message },
            { status: 500 }
        )
    }

    const membershipsRes = await supabaseAdmin
        .from('organization_memberships')
        .select('user_id, org_id, role, status')
        .in('status', ['active', 'invited'])

    if (membershipsRes.error) {
        return NextResponse.json(
            { success: false, error: 'Internal', message: membershipsRes.error.message },
            { status: 500 }
        )
    }

    const organizationsRes = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .order('name', { ascending: true })

    if (organizationsRes.error) {
        return NextResponse.json(
            { success: false, error: 'Internal', message: organizationsRes.error.message },
            { status: 500 }
        )
    }

    const authMap = new Map(
        (authUsersRes.data.users || []).map((user) => [
            user.id,
            {
                last_sign_in_at: user.last_sign_in_at ?? null,
            },
        ])
    )

    const orgMap = new Map((organizationsRes.data || []).map((org) => [org.id, org.name]))
    const memberships = membershipsRes.data || []

    const membershipMap = new Map<string, Array<{ org_id: string; org_name: string | null; role: string; status: string }>>()
    for (const membership of memberships) {
        const current = membershipMap.get(membership.user_id) ?? []
        const nextEntry = {
            org_id: membership.org_id,
            org_name: orgMap.get(membership.org_id) ?? null,
            role: membership.role,
            status: membership.status,
        }
        const existingIndex = current.findIndex((entry) => entry.org_id === membership.org_id)

        if (existingIndex >= 0) {
            const shouldReplace =
                current[existingIndex].status !== 'active' && membership.status === 'active'

            if (shouldReplace) {
                current[existingIndex] = nextEntry
            }
        } else {
            current.push(nextEntry)
        }
        membershipMap.set(membership.user_id, current)
    }

    const mergedUsers = (data || []).map((entry) => {
        const meta = (entry.meta as { superadmin?: { is_active?: boolean; deactivated_at?: string | null } } | null) ?? {}
        const userMemberships = membershipMap.get(entry.id) ?? []
        return {
            id: entry.id,
            name: entry.name,
            email: entry.email,
            role: entry.role,
            avatar_url: entry.avatar_url,
            created_at: entry.created_at,
            updated_at: entry.updated_at,
            last_sign_in_at: authMap.get(entry.id)?.last_sign_in_at ?? null,
            is_active: meta.superadmin?.is_active !== false,
            deactivated_at: meta.superadmin?.deactivated_at ?? null,
            organizations: userMemberships,
        }
    })

    const filteredUsers = orgId
        ? mergedUsers.filter((entry) => entry.organizations.some((org) => org.org_id === orgId))
        : mergedUsers

    return NextResponse.json({
        success: true,
        data: {
            users: filteredUsers,
            organizations: organizationsRes.data ?? [],
        },
    })
}
