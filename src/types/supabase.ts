export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      teas: {
        Row: {
          id: string
          created_at: string
          name: string
          category: string
          category_id: string
          subcategory_id: string
          description: string | null
          origin: string | null
          brewing_temp: number | null
          brewing_time: number | null
          image_url: string | null
          slug: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          category: string
          category_id: string
          subcategory_id: string
          description?: string | null
          origin?: string | null
          brewing_temp?: number | null
          brewing_time?: number | null
          image_url?: string | null
          slug: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          category?: string
          category_id?: string
          subcategory_id?: string
          description?: string | null
          origin?: string | null
          brewing_temp?: number | null
          brewing_time?: number | null
          image_url?: string | null
          slug?: string
        }
      }
      articles: {
        Row: {
          id: string
          created_at: string
          title: string
          content: string | null
          slug: string
          published_at: string | null
          image_url: string | null
          summary: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          content?: string | null
          slug: string
          published_at?: string | null
          image_url?: string | null
          summary?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          content?: string | null
          slug?: string
          published_at?: string | null
          image_url?: string | null
          summary?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
