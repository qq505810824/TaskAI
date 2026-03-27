'use client'

import { useAuth } from '@/hooks/useAuth'
import { useTaskaiMemberships } from '@/hooks/useTaskaiMemberships'
import { cn } from '@/lib/utils'
import { Brain } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import MenuButton from './MenuButton'

export type HeaderProps = {
    /** TaskAI 品牌区（渐变图标 + Task<span className="text-indigo-600">AI</span>） */
    taskaiBrand?: boolean
    /** 是否展示营销导航（预留；当前 Header 以 Logo + 用户区为主） */
    showMarketingNav?: boolean
    /** 点击品牌区域跳转，默认 `/`；TaskAI 一般为 `/taskai/tasks` 或 `/admin/taskai/tasks` */
    brandHref?: string
    /** 用户菜单左侧自定义区域（积分池、组织切换等） */
    trailingSlot?: ReactNode
    className?: string
}

function OrgSwitcher({
    value,
    onChange,
    options,
    scopeLabel,
    ariaLabel,
}: {
    value: string
    onChange: (v: string) => void
    options: Array<{ id: string; orgId: string; name: string | null }>
    scopeLabel: string
    ariaLabel: string
}) {
    return (
        <div className=" flex flex-row items-center space-x-2">
            <label className="mb-1 flex items-center gap-1.5 text-md font-bold tracking-wide text-slate-500">
                Team:
            </label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="max-w-[220px]   rounded-xl border border-slate-200 bg-white pl-3 pr-9 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                    aria-label={ariaLabel}
                >
                    {options.map((opt) => (
                        <option key={opt.id} value={opt.orgId}>
                            {opt.name}
                        </option>
                    ))}
                </select>
                {/* <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /> */}
            </div>
        </div>
    )
}

export function Header({
    taskaiBrand = false,
    showMarketingNav = true,
    brandHref: brandHrefProp,
    trailingSlot,
    className,
}: HeaderProps) {
    const { user, logout } = useAuth()
    const { memberships } = useTaskaiMemberships()
    const router = useRouter()
    const pathname = usePathname()
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
    const [selectedMemberOrgId, setSelectedMemberOrgId] = useState<string | null>(null)
    const ownerMemberships = useMemo(() => memberships.filter((m) => m.role === 'owner'), [memberships])
    const memberSideMemberships = useMemo(
        () => memberships.filter((m) => m.role === 'member' || m.role === 'owner'),
        [memberships]
    )
    const isTaskaiAdminRoute = pathname.startsWith('/admin/taskai')
    const isTaskaiMemberRoute = pathname.startsWith('/taskai')

    const brandHref = brandHrefProp ?? '/'

    void showMarketingNav
    void logout

    useEffect(() => {
        if (!ownerMemberships.length) {
            setSelectedOrgId(null)
            return
        }
        let initial: string | null = null
        try {
            const stored = localStorage.getItem('taskai_admin_org_id')
            if (stored && ownerMemberships.some((m) => m.org_id === stored)) initial = stored
        } catch {
            /* */
        }
        if (!initial) initial = ownerMemberships[0].org_id
        setSelectedOrgId(initial)
    }, [ownerMemberships])

    useEffect(() => {
        if (!memberSideMemberships.length) {
            setSelectedMemberOrgId(null)
            return
        }
        let initial: string | null = null
        try {
            const stored = localStorage.getItem('taskai_member_org_id')
            if (stored && memberSideMemberships.some((m) => m.org_id === stored)) initial = stored
        } catch {
            /* */
        }
        if (!initial) initial = memberSideMemberships[0].org_id
        setSelectedMemberOrgId(initial)
    }, [memberSideMemberships])

    const onSwitchOrg = (nextOrgId: string) => {
        setSelectedOrgId(nextOrgId)
        try {
            localStorage.setItem('taskai_admin_org_id', nextOrgId)
            window.dispatchEvent(
                new CustomEvent('taskai-admin-org-changed', {
                    detail: { orgId: nextOrgId },
                })
            )
        } catch {
            /* */
        }
    }

    const onSwitchMemberOrg = (nextOrgId: string) => {
        setSelectedMemberOrgId(nextOrgId)
        try {
            localStorage.setItem('taskai_member_org_id', nextOrgId)
            window.dispatchEvent(
                new CustomEvent('taskai-member-org-changed', {
                    detail: { orgId: nextOrgId },
                })
            )
        } catch {
            /* */
        }
    }

    return (
        <header
            className={cn(
                'sticky top-0 z-50 border-b shadow-sm',
                taskaiBrand ? 'border-slate-200 bg-white' : 'border-gray-200 bg-white',
                className
            )}
        >
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div
                    className="flex cursor-pointer items-center gap-3"
                    onClick={() => router.push(brandHref)}
                >
                    {taskaiBrand ? (
                        <>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
                                <Brain className="h-4 w-4 text-white" aria-hidden />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold leading-tight text-slate-800">
                                    Task<span className="text-indigo-600">AI</span>- Admin
                                </h1>
                                <p className="-mt-0.5 hidden text-xs text-slate-400 sm:block">
                                    Intelligent Collaboration
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
                                <Brain className="h-4 w-4 text-white" aria-hidden />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold leading-tight text-slate-800">
                                    Task<span className="text-indigo-600">AI</span>
                                </h1>
                                <p className="-mt-0.5 hidden text-xs text-slate-400 sm:block">
                                    Intelligent Collaboration
                                </p>
                            </div>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    {isTaskaiAdminRoute && ownerMemberships.length > 0 ? (
                        <OrgSwitcher
                            value={selectedOrgId ?? ''}
                            onChange={onSwitchOrg}
                            options={ownerMemberships.map((m) => ({
                                id: m.id,
                                orgId: m.org_id,
                                name: m.organization?.name ?? null,
                            }))}
                            scopeLabel="Admin Org"
                            ariaLabel="Switch organization"
                        />
                    ) : null}
                    {!isTaskaiAdminRoute && isTaskaiMemberRoute && memberSideMemberships.length > 0 ? (
                        <OrgSwitcher
                            value={selectedMemberOrgId ?? ''}
                            onChange={onSwitchMemberOrg}
                            options={memberSideMemberships.map((m) => ({
                                id: m.id,
                                orgId: m.org_id,
                                name: m.organization?.name ?? null,
                            }))}
                            scopeLabel="Your Org"
                            ariaLabel="Switch member organization"
                        />
                    ) : null}
                    {trailingSlot}
                    <div className="flex items-center gap-3 pl-2 sm:pl-6">
                        {user ? (
                            <>
                                <div className="hidden text-right md:block">
                                    <p className="text-md font-semibold text-gray-900">{user?.username}</p>
                                    <p className="text-xs text-gray-500">{user?.email}</p>
                                </div>
                                <MenuButton name={user?.username} email={user?.email} avatar={user?.avatar} />
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => router.push('/login')}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                登录
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
