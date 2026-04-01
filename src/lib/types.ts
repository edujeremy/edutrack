// ============================================
// EduTrack v2: 학원 관리 자동화 타입 정의
// ============================================

export type Role = 'admin' | 'teacher' | 'parent'

export type CommentStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
export type AttendanceStatus = 'scheduled' | 'attended' | 'absent' | 'cancelled'
export type AbsenceRequestStatus = 'pending' | 'approved' | 'rejected'
export type ConsultationRequestStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled'
export type PaySettlementStatus = 'pending' | 'paid' | 'confirmed'
export type PaymentStatus = 'unpaid' | 'paid' | 'overdue'
export type StudentStatus = 'active' | 'inactive' | 'graduated'
export type PackageStatus = 'active' | 'completed' | 'paused' | 'cancelled'

// ---- Row Types ----

export interface Profile {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  name: string
  school: string | null
  grade: number | null
  parent_id: string | null
  parent_name: string | null
  parent_phone: string | null
  parent_email: string | null
  status: StudentStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Teacher {
  id: string
  profile_id: string
  per_session_rate: number
  settlement_cycle: number
  bank_info: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Package {
  id: string
  name: string
  student_id: string
  teacher_id: string
  total_sessions: number
  completed_sessions: number
  tuition_amount: number
  tuition_status: PaymentStatus
  schedule_days: number[]
  start_time: string
  end_time: string
  start_date: string
  status: PackageStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  package_id: string
  session_number: number
  lesson_date: string
  start_time: string
  end_time: string
  attendance: AttendanceStatus
  absence_reason: string | null
  is_billable: boolean
  is_teacher_payable: boolean
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  lesson_id: string
  teacher_id: string
  progress: string
  homework_evaluation: string
  strengths: string
  improvements: string
  homework: string
  status: CommentStatus
  submitted_at: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  rejection_reason: string | null
  sent_to_parent_at: string | null
  created_at: string
  updated_at: string
}

export interface TeacherPaySettlement {
  id: string
  teacher_id: string
  period_start: string
  period_end: string
  session_count: number
  per_session_rate: number
  total_amount: number
  status: PaySettlementStatus
  paid_at: string | null
  confirmed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AbsenceRequest {
  id: string
  lesson_id: string
  parent_id: string
  reason: string
  status: AbsenceRequestStatus
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
}

export interface ConsultationRequest {
  id: string
  parent_id: string
  student_id: string
  subject: string
  message: string | null
  preferred_date: string | null
  preferred_time: string | null
  status: ConsultationRequestStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  action_url: string | null
  created_at: string
}

export interface NotificationSettings {
  id: string
  user_id: string
  lesson_reminder: boolean
  reminder_minutes: number
  email_notifications: boolean
  created_at: string
  updated_at: string
}

// ---- Join Types (for UI convenience) ----

export interface LessonWithDetails extends Lesson {
  package?: Package
  comment?: Comment | null
  student_name?: string
  teacher_name?: string
}

export interface PackageWithDetails extends Package {
  student?: Student
  teacher?: Teacher & { profile?: Profile }
  lessons?: Lesson[]
}

export interface CommentWithDetails extends Comment {
  lesson?: Lesson & { package?: Package }
  teacher?: Profile
  student_name?: string
}

// ---- Supabase Database type for client ----
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id?: string; name: string; email: string; role: Role }; Update: Partial<Profile> }
      students: { Row: Student; Insert: Partial<Student> & { name: string }; Update: Partial<Student> }
      teachers: { Row: Teacher; Insert: Partial<Teacher> & { profile_id: string }; Update: Partial<Teacher> }
      packages: { Row: Package; Insert: Partial<Package> & { name: string; student_id: string; teacher_id: string; total_sessions: number; schedule_days: number[]; start_time: string; end_time: string; start_date: string }; Update: Partial<Package> }
      lessons: { Row: Lesson; Insert: Partial<Lesson> & { package_id: string; session_number: number; lesson_date: string; start_time: string; end_time: string }; Update: Partial<Lesson> }
      comments: { Row: Comment; Insert: Partial<Comment> & { lesson_id: string; teacher_id: string }; Update: Partial<Comment> }
      teacher_pay_settlements: { Row: TeacherPaySettlement; Insert: Partial<TeacherPaySettlement> & { teacher_id: string; period_start: string; period_end: string; session_count: number; per_session_rate: number; total_amount: number }; Update: Partial<TeacherPaySettlement> }
      absence_requests: { Row: AbsenceRequest; Insert: Partial<AbsenceRequest> & { lesson_id: string; parent_id: string; reason: string }; Update: Partial<AbsenceRequest> }
      consultation_requests: { Row: ConsultationRequest; Insert: Partial<ConsultationRequest> & { parent_id: string; student_id: string; subject: string }; Update: Partial<ConsultationRequest> }
      notifications: { Row: Notification; Insert: Partial<Notification> & { user_id: string; title: string; message: string }; Update: Partial<Notification> }
      notification_settings: { Row: NotificationSettings; Insert: Partial<NotificationSettings> & { user_id: string }; Update: Partial<NotificationSettings> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
