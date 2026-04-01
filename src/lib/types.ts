export type Role = 'admin' | 'manager' | 'teacher' | 'student' | 'parent'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          role: Role
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          role: Role
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          role?: Role
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          profile_id: string
          school: string | null
          grade: number | null
          parent_name: string | null
          parent_phone: string | null
          parent_email: string | null
          enrollment_date: string
          status: 'active' | 'inactive' | 'graduated'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          school?: string | null
          grade?: number | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_email?: string | null
          enrollment_date?: string
          status?: 'active' | 'inactive' | 'graduated'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          school?: string | null
          grade?: number | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_email?: string | null
          enrollment_date?: string
          status?: 'active' | 'inactive' | 'graduated'
          created_at?: string
          updated_at?: string
        }
      }
      consultations: {
        Row: {
          id: string
          student_id: string
          teacher_id: string
          consultation_date: string
          topics: string[]
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          teacher_id: string
          consultation_date: string
          topics?: string[]
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          teacher_id?: string
          consultation_date?: string
          topics?: string[]
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      university_applications: {
        Row: {
          id: string
          student_id: string
          university_name: string
          major: string
          application_date: string
          status: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted'
          documents: string[] | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          university_name: string
          major: string
          application_date?: string
          status?: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted'
          documents?: string[] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          university_name?: string
          major?: string
          application_date?: string
          status?: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted'
          documents?: string[] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schedules: {
        Row: {
          id: string
          teacher_id: string
          student_id: string
          subject: string
          day_of_week: number
          start_time: string
          end_time: string
          room: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          student_id: string
          subject: string
          day_of_week: number
          start_time: string
          end_time: string
          room?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          student_id?: string
          subject?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          room?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          student_id: string
          amount: number
          currency: string
          payment_date: string
          due_date: string
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          description: string | null
          transaction_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          amount: number
          currency?: string
          payment_date?: string
          due_date: string
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          description?: string | null
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          amount?: number
          currency?: string
          payment_date?: string
          due_date?: string
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          description?: string | null
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'error'
          read: boolean
          action_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: 'info' | 'success' | 'warning' | 'error'
          read?: boolean
          action_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'info' | 'success' | 'warning' | 'error'
          read?: boolean
          action_url?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Extracted types for convenience
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Student = Database['public']['Tables']['students']['Row']
export type StudentInsert = Database['public']['Tables']['students']['Insert']
export type StudentUpdate = Database['public']['Tables']['students']['Update']

export type Consultation = Database['public']['Tables']['consultations']['Row']
export type ConsultationInsert = Database['public']['Tables']['consultations']['Insert']
export type ConsultationUpdate = Database['public']['Tables']['consultations']['Update']

export type UniversityApplication = Database['public']['Tables']['university_applications']['Row']
export type UniversityApplicationInsert = Database['public']['Tables']['university_applications']['Insert']
export type UniversityApplicationUpdate = Database['public']['Tables']['university_applications']['Update']

export type Schedule = Database['public']['Tables']['schedules']['Row']
export type ScheduleInsert = Database['public']['Tables']['schedules']['Insert']
export type ScheduleUpdate = Database['public']['Tables']['schedules']['Update']

export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']

export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']
