import { Database } from './supabase'

export type Tea = Database['public']['Tables']['teas']['Row']
export type Article = Database['public']['Tables']['articles']['Row']

export interface User {
  id: string
  username: string
  email: string
  avatar: string
  role?: 'admin' | 'user'
  token?: string // Mock token
}
