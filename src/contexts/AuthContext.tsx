'use client'

import { supabase } from '@/lib/supabase'
import type { User } from '@/types'
import { useRouter } from 'next/navigation'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'

interface AuthContextType {
    user: User | null
    login: (email: string, password: string) => Promise<void>
    register: (username: string, email: string, password: string) => Promise<void>
    logout: () => void
    updateUser: (data: Partial<User>) => void
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    // 从 Supabase 会话中恢复用户
    useEffect(() => {
        const init = async () => {
            const {
                data: { session }
            } = await supabase.auth.getSession()

            const authUser = session?.user
            if (authUser) {
                const username =
                    (authUser.user_metadata as any)?.username ||
                    (authUser.email ? authUser.email.split('@')[0] : '用户')

                // 尝试从 users 表获取最新的用户信息
                const { data: userData } = await supabase
                    .from('users')
                    .select('name, avatar_url, role')
                    .eq('id', authUser.id)
                    .single()

                const mappedUser: User = {
                    id: authUser.id,
                    username: userData?.name || username,
                    email: authUser.email || '',
                    avatar: userData?.avatar_url || '',
                    role: userData?.role as 'admin' | 'user' || 'user',
                    token: session.access_token
                }

                setUser(mappedUser)
            }
            // else {
            //     const mappedUser: User = {
            //         "id": "14355296-f486-4e25-8805-fac63260e1f5",
            //         "username": "Talent",
            //         "email": "talent@gmail.com",
            //         "avatar": "https://ocosfpngrcmsolsygqxe.supabase.co/storage/v1/object/public/users-avatar/14355296-f486-4e25-8805-fac63260e1f5-0.6113174729709092.jpeg",
            //         "token": "eyJhbGciOiJFUzI1NiIsImtpZCI6ImI3YTc3NWIxLTc2MDMtNDBjZS04MGFlLTY0M2Y1NWMyYzhiOCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL29jb3NmcG5ncmNtc29sc3lncXhlLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIxNDM1NTI5Ni1mNDg2LTRlMjUtODgwNS1mYWM2MzI2MGUxZjUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc0NDI3MzMxLCJpYXQiOjE3NzQ0MjM3MzEsImVtYWlsIjoidGFsZW50QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJ0YWxlbnRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiMTQzNTUyOTYtZjQ4Ni00ZTI1LTg4MDUtZmFjNjMyNjBlMWY1IiwidXNlcm5hbWUiOiJUYWxlbnQifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc3NDQyMzczMH1dLCJzZXNzaW9uX2lkIjoiMWYyNGY5NjEtYzlmYy00NDA0LThlNGMtNmJiZDhjYmRjZDU4IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.CXrzAagVlpcEuNjOU3gg4DuwxUrmy0faL83kYAMXbyAyVFziTAnIzsRmfxH-AWlV9WGS4EuC-NlVairX_nLfsg"
            //     }
            //     setUser(mappedUser)
            // }
            setIsLoading(false)
        }

        void init()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const syncUserToProfiles = async (authUserId: string, email: string | null, username: string | null) => {
        try {
            await fetch('/api/auth/sync-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    authUserId,
                    email,
                    name: username
                })
            })
        } catch (e) {
            console.error('Failed to sync user to users table', e)
        }
    }

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
            const authUser = data.user
            let username =
                (authUser.user_metadata as any)?.username ||
                (authUser.email ? authUser.email.split('@')[0] : '用户')

            await syncUserToProfiles(authUser.id, authUser.email ?? null, username)

            // 尝试从 users 表获取最新的用户信息
            const { data: userData } = await supabase
                .from('users')
                .select('name, avatar_url, role')
                .eq('id', authUser.id)
                .single()

            if (userData?.name) {
                username = userData.name
            }

            const mappedUser: User = {
                id: authUser.id,
                username,
                email: authUser.email || '',
                avatar: userData?.avatar_url || authUser.user_metadata?.avatar_url || '',
                role: userData?.role as 'admin' | 'user' || 'user',
                token: data.session.access_token
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
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username }
                }
            })

            if (error) {
                throw new Error(error.message || '注册失败')
            }

            const authUser = data.user

            if (!authUser) {
                // 需要邮箱验证的情况
                setIsLoading(false)
                router.push('/login')
                return
            }

            await syncUserToProfiles(authUser.id, authUser.email ?? null, username)

            const mappedUser: User = {
                id: authUser.id,
                username,
                email: authUser.email || '',
                avatar: authUser.user_metadata?.avatar_url || '',
                role: 'user'
            }

            setUser(mappedUser)
            const redirect = typeof window !== 'undefined'
                ? new URLSearchParams(window.location.search).get('redirect')
                : null
            router.push(redirect ?? '/')
        } finally {
            setIsLoading(false)
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
        <AuthContext.Provider value={{ user, login, register, logout, updateUser, isLoading }}>
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
