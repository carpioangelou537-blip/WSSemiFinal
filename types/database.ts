export type UserRole = 'hr' | 'manager' | 'it_admin'
export type RequestStatus = 'pending_manager' | 'approved' | 'rejected' | 'provisioned'
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          role: UserRole
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          role: UserRole
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          role?: UserRole
        }
        Relationships: []
      }
      access_catalog: {
        Row: {
          id: string
          name: string
          description: string | null
          ad_group_name: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          ad_group_name?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          ad_group_name?: string | null
        }
        Relationships: []
      }
      role_templates: {
        Row: {
          id: string
          job_title: string
          department: string
          access_id: string
        }
        Insert: {
          id?: string
          job_title: string
          department: string
          access_id: string
        }
        Update: {
          id?: string
          job_title?: string
          department?: string
          access_id?: string
        }
        Relationships: []
      }
      onboarding_requests: {
        Row: {
          id: string
          employee_name: string
          employee_email: string
          job_title: string
          department: string
          start_date: string | null
          manager_id: string
          requested_by: string
          status: RequestStatus
          ai_summary: string | null
          manager_comment: string | null
          powershell_script: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          employee_name: string
          employee_email: string
          job_title: string
          department: string
          start_date?: string | null
          manager_id: string
          requested_by: string
          status?: RequestStatus
          ai_summary?: string | null
          manager_comment?: string | null
          powershell_script?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          employee_name?: string
          employee_email?: string
          job_title?: string
          department?: string
          start_date?: string | null
          manager_id?: string
          requested_by?: string
          status?: RequestStatus
          ai_summary?: string | null
          manager_comment?: string | null
          powershell_script?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      request_access_items: {
        Row: {
          id: string
          request_id: string
          access_id: string
          ai_suggested: boolean
          approved: boolean | null
        }
        Insert: {
          id?: string
          request_id: string
          access_id: string
          ai_suggested?: boolean
          approved?: boolean | null
        }
        Update: {
          id?: string
          request_id?: string
          access_id?: string
          ai_suggested?: boolean
          approved?: boolean | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          request_id: string | null
          actor_id: string | null
          action: string
          details: Json
          created_at: string | null
        }
        Insert: {
          id?: string
          request_id?: string | null
          actor_id?: string | null
          action: string
          details?: Json
          created_at?: string | null
        }
        Update: {
          id?: string
          request_id?: string | null
          actor_id?: string | null
          action?: string
          details?: Json
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      request_status: RequestStatus
    }
  }
}
