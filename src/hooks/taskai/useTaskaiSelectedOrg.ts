'use client'

import type { TaskaiMembership } from '@/types/taskai'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Scope = 'admin' | 'member'

const ORG_SELECTION_CONFIG: Record<
    Scope,
    {
        storageKey: string
        eventName: string
    }
> = {
    admin: {
        storageKey: 'taskai_admin_org_id',
        eventName: 'taskai-admin-org-changed',
    },
    member: {
        storageKey: 'taskai_member_org_id',
        eventName: 'taskai-member-org-changed',
    },
}

function getStoredOrgId(storageKey: string) {
    try {
        return localStorage.getItem(storageKey)
    } catch {
        return null
    }
}

export function setTaskaiSelectedOrg(scope: Scope, nextOrgId: string) {
    const config = ORG_SELECTION_CONFIG[scope]
    try {
        localStorage.setItem(config.storageKey, nextOrgId)
        window.dispatchEvent(
            new CustomEvent(config.eventName, {
                detail: { orgId: nextOrgId },
            })
        )
    } catch {
        /* */
    }
}

export function useTaskaiSelectedOrg(
    memberships: Pick<TaskaiMembership, 'org_id'>[],
    scope: Scope
) {
    const config = ORG_SELECTION_CONFIG[scope]
    const [orgId, setOrgId] = useState<string | null>(null)

    const eligibleOrgIds = useMemo(() => memberships.map((membership) => membership.org_id), [memberships])

    const selectOrg = useCallback(
        (nextOrgId: string) => {
            if (!eligibleOrgIds.includes(nextOrgId)) return
            setOrgId(nextOrgId)
            setTaskaiSelectedOrg(scope, nextOrgId)
        },
        [eligibleOrgIds, scope]
    )

    useEffect(() => {
        if (!eligibleOrgIds.length) {
            setOrgId(null)
            return
        }

        setOrgId((currentOrgId) => {
            if (currentOrgId && eligibleOrgIds.includes(currentOrgId)) {
                return currentOrgId
            }

            const storedOrgId = getStoredOrgId(config.storageKey)
            if (storedOrgId && eligibleOrgIds.includes(storedOrgId)) {
                return storedOrgId
            }

            return eligibleOrgIds[0]
        })
    }, [config.storageKey, eligibleOrgIds])

    useEffect(() => {
        const handleOrgChanged = (event: Event) => {
            const nextOrgId = (event as CustomEvent<{ orgId?: string }>).detail?.orgId
            if (nextOrgId && eligibleOrgIds.includes(nextOrgId)) {
                setOrgId(nextOrgId)
            }
        }

        window.addEventListener(config.eventName, handleOrgChanged as EventListener)
        return () => window.removeEventListener(config.eventName, handleOrgChanged as EventListener)
    }, [config.eventName, eligibleOrgIds])

    return { orgId, setOrgId: selectOrg }
}
