import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// Type definitions for better TypeScript support
export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          google_drive_folder_id: string | null
          subscription_tier: 'basic' | 'pro' | 'enterprise'
          settings: Record<string, unknown>
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          google_drive_folder_id?: string | null
          subscription_tier?: 'basic' | 'pro' | 'enterprise'
          settings?: Record<string, unknown>
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          google_drive_folder_id?: string | null
          subscription_tier?: 'basic' | 'pro' | 'enterprise'
          settings?: Record<string, unknown>
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          tenant_id: string
          google_file_id: string
          title: string
          mime_type: string | null
          file_extension: string | null
          file_size_bytes: number | null
          current_version_id: string | null
          current_status: 'DRAFT' | 'REVIEW' | 'LIVE' | 'ARCHIVED'
          google_drive_metadata: Record<string, unknown> | null
          last_synced_at: string | null
          sync_status: 'pending' | 'syncing' | 'synced' | 'failed'
          sync_error: string | null
          created_at: string
          updated_at: string
        }
        // Insert and Update types would go here
      }
      // Add other tables as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      document_status: 'DRAFT' | 'REVIEW' | 'LIVE' | 'ARCHIVED'
      sync_status: 'pending' | 'syncing' | 'synced' | 'failed'
      subscription_tier: 'basic' | 'pro' | 'enterprise'
    }
  }
}
