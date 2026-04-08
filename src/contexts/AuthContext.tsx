'use client'

import { supabase } from '@/lib/supabase'
import type { User } from '@/types'
import type { Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'

interface AuthContextType {
    user: User | null
    login: (email: string, password: string) => Promise<void>
    register: (username: string, email: string, password: string) => Promise<void>
    loginWithGoogle: (redirectTo?: string | null) => Promise<void>
    logout: () => void
    updateUser: (data: Partial<User>) => void
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    const getAuthDisplayName = (authUser: Session['user']) =>
        authUser.user_metadata?.username ||
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        (authUser.email ? authUser.email.split('@')[0] : '用户')

    const getAuthAvatar = (authUser: Session['user']) =>
        authUser.user_metadata?.avatar_url ||
        authUser.user_metadata?.picture ||
        authUser.user_metadata?.photo_url ||
        ''

    const syncUserToProfiles = async (
        authUserId: string,
        email: string | null,
        name: string | null,
        avatarUrl?: string | null
    ) => {
        try {
            await fetch('/api/auth/sync-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    authUserId,
                    email,
                    name,
                    avatarUrl: avatarUrl ?? null
                })
            })
        } catch (e) {
            console.error('Failed to sync user to users table', e)
        }
    }

    const buildMappedUser = async (session: Session | null): Promise<User | null> => {
        const authUser = session?.user
        if (!authUser || !session) {
            return null
        }

        const username = getAuthDisplayName(authUser)
        const avatar = getAuthAvatar(authUser)

        await syncUserToProfiles(authUser.id, authUser.email ?? null, username, avatar)

        const { data: userData } = await supabase
            .from('users')
            .select('name, avatar_url, role, meta')
            .eq('id', authUser.id)
            .single()

        const isActive =
            (userData?.meta as { superadmin?: { is_active?: boolean } } | null)?.superadmin?.is_active !== false

        if (!isActive) {
            await supabase.auth.signOut()
            throw new Error('This account has been deactivated')
        }

        return {
            id: authUser.id,
            username: userData?.name || username,
            email: authUser.email || '',
            avatar: userData?.avatar_url || avatar,
            role: (userData?.role as 'admin' | 'user') || 'user',
            token: session.access_token
        }
    }

    useEffect(() => {
        const init = async () => {
            try {
                const {
                    data: { session }
                } = await supabase.auth.getSession()

                const mappedUser = await buildMappedUser(session)
                setUser(mappedUser)
            } catch (initError) {
                console.error(initError)
                setUser(null)
            }
            setIsLoading(false)
        }

        void init()

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((_event, session) => {
            void (async () => {
                try {
                    const mappedUser = await buildMappedUser(session)
                    setUser(mappedUser)
                } catch (authStateError) {
                    console.error(authStateError)
                    setUser(null)
                }
            })()
        })

        return () => {
            subscription.unsubscribe()
        }
        // buildMappedUser is intentionally defined inline here so auth session restore
        // and auth state changes share the same sync/mapping logic.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const login = async (email: string, password: string) => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error || !data.user || !data.session) {
                throw new Error(error?.message || '登录失败')
            }

            const mappedUser = await buildMappedUser(data.session)
            if (!mappedUser) {
                throw new Error('登录失败')
            }

            setUser(mappedUser)
            localStorage.setItem('talent_token', data.session.access_token)
            router.push('/')
        } finally {
            setIsLoading(false)
        }
    }

    const register = async (username: string, email: string, password: string) => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            })

            const payload = (await response.json()) as {
                success?: boolean
                message?: string
            }

            if (!response.ok || !payload.success) {
                throw new Error(payload.message || '注册失败')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const loginWithGoogle = async (redirectTo?: string | null) => {
        const callbackUrl = new URL('/auth/callback', window.location.origin)
        if (redirectTo) {
            callbackUrl.searchParams.set('next', redirectTo)
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: callbackUrl.toString()
            }
        })

        if (error) {
            throw new Error(error.message || 'Google 登录失败')
        }
    }

    const logout = async () => {
        await supabase.auth.signOut()
        setUser(null)
        router.push('/login')
    }

    const updateUser = (data: Partial<User>) => {
        if (user) {
            setUser({ ...user, ...data })
        }
    }

    return (
        <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout, updateUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
