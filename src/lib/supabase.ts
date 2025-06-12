import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please set up your Supabase connection.')
}

// Create client with fallback values to prevent errors during development
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: string
          admin_level: string  // Changed to string to support 'super_admin', 'admin', 'user'
          description: string | null
          permissions: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: string
          admin_level?: string
          description?: string | null
          permissions?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: string
          admin_level?: string
          description?: string | null
          permissions?: any
          created_at?: string
          updated_at?: string
        }
      }
      vendors: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          service_types: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          service_types?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          service_types?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      couples: {
        Row: {
          id: string
          partner1_name: string
          partner2_name: string
          email: string
          phone: string | null
          wedding_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          partner1_name: string
          partner2_name: string
          email: string
          phone?: string | null
          wedding_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          partner1_name?: string
          partner2_name?: string
          email?: string
          phone?: string | null
          wedding_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          couple_id: string
          vendor_id: string
          event_date: string
          location: string | null
          service_type: string
          status: string
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          couple_id: string
          vendor_id: string
          event_date: string
          location?: string | null
          service_type: string
          status?: string
          amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          couple_id?: string
          vendor_id?: string
          event_date?: string
          location?: string | null
          service_type?: string
          status?: string
          amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          vendor_id: string
          couple_id: string | null
          start_time: string
          end_time: string
          title: string | null
          description: string | null
          location: string | null
          type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          couple_id?: string | null
          start_time: string
          end_time: string
          title?: string | null
          description?: string | null
          location?: string | null
          type: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          couple_id?: string | null
          start_time?: string
          end_time?: string
          title?: string | null
          description?: string | null
          location?: string | null
          type?: string
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          amount: number
          status: string
          stripe_payment_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          amount: number
          status?: string
          stripe_payment_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          amount?: number
          status?: string
          stripe_payment_id?: string | null
          created_at?: string
        }
      }
      import_history: {
        Row: {
          id: string
          type: string
          filename: string
          user_id: string
          timestamp: string
          rows_added: number
          errors: number
          status: string
          error_details: any
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          filename: string
          user_id: string
          timestamp?: string
          rows_added?: number
          errors?: number
          status: string
          error_details?: any
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          filename?: string
          user_id?: string
          timestamp?: string
          rows_added?: number
          errors?: number
          status?: string
          error_details?: any
          created_at?: string
        }
      }
    }
  }
}