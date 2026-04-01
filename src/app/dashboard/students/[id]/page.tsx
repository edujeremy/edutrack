import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentDetailTabs } from '@/components/students/StudentDetailTabs'
import { ArrowLeft, Edit2, Trash2, Badge } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusConfig = {
  active: { label: '활성', color: 'bg-green-100 text-green-800' },
  inactive: { label: '비활성', color: 'bg-gray-100 text-gray-800' },
  graduated: { label: '졸업', color: 'bg-blue-100 text-blue-800' },
  withdrawn: { label: '퇴원', color: 'bg-red-100 text-red-800' },
}

async function StudentDetailContent({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch student with all related data
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select(
      `
      id,
      profile_id,
      school,
      grade,
      parent_name,
      parent_phone,
      parent_email,
      enrollment_date,
      status,
      created_at,
      updated_at,
      profiles:profile_id (id, name, email, phone, role),
      teacher:teacher_id (id, name)
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (studentError || !student) {
    notFound()
  }

  // Fetch consultations
  const { data: consultations = [] } = await supabase
    .from('consultations')
    .select('*')
    .eq('student_id', id)
    .order('consultation_date', { ascending: false })

  // Fetch university applications
  const { data: applications = [] } = await supabase
    .from('university_applications')
    .select('*')
    .eq('student_id', id)
    .order('application_date', { ascending: false })

  // Fetch schedules
  const { data: schedules = [] } = await supabase
    .from('schedules')
    .select('*')
    .eq('student_id', id)
    .eq('is_active', true)

  // Fetch payments
  const { data: payments = [] } = await supabase
    .from('payments')
    .select('*')
    .eq('student_id', id)
    .order('payment_date', { ascending: false })

  // Check if user can edit
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const canEdit = ['admin', 'manager'].includes(userProfile?.role || '')

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard/students"
          className="inline-flex items-center gap-2 text-blue-600 transition-colors hover:text-blue-700"
        >
          <ArrowLeft className="h-5 w-5" />
          목록으로 돌아가기
        </Link>
      </div>

      {/* Student Info Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{student.profiles.name}</h1>
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                  statusConfig[student.status as keyof typeof statusConfig]?.color ||
                  'bg-gray-100 text-gray-800'
                }`}
              >
                {statusConfig[student.status as keyof typeof statusConfig]?.label ||
                  student.status}
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {student.school && (
                <div>
                  <p className="text-sm text-gray-500">학교</p>
                  <p className="font-medium text-gray-900">{student.school}</p>
                </div>
              )}
              {student.grade && (
                <div>
                  <p className="text-sm text-gray-500">학년</p>
                  <p className="font-medium text-gray-900">{student.grade}학년</p>
                </div>
              )}
              {student.teacher && (
                <div>
                  <p className="text-sm text-gray-500">담당선생님</p>
                  <p className="font-medium text-gray-900">{student.teacher.name}</p>
                </div>
              )}
            </div>
          </div>

          {canEdit && (
            <div className="flex gap-2">
              <Link
                href={`/dashboard/students/${id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Edit2 className="h-4 w-4" />
                수정
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <StudentDetailTabs
          student={{
            ...student,
            profile: student.profiles,
          }}
          consultations={consultations}
          applications={applications}
          schedules={schedules}
          payments={payments}
        />
      </div>
    </div>
  )
}

export default function StudentDetailPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
        </div>
      }
    >
      <StudentDetailContent {...props} />
    </Suspense>
  )
}
