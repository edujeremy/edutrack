import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { RecentConsultations } from '@/components/dashboard/RecentConsultations'
import { UpcomingSchedules } from '@/components/dashboard/UpcomingSchedules'
import { ApplicationStatus } from '@/components/dashboard/ApplicationStatus'
import { PaymentSummary } from '@/components/dashboard/PaymentSummary'
import { User, MessageSquare, GraduationCap, CreditCard } from 'lucide-react'
import Link from 'next/link'

export default async function ParentDashboardPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'parent' && profile.role !== 'student')) {
    redirect('/dashboard')
  }

  // Get student profile for parent
  let studentId = profile.id // If user is student, use their own ID
  if (profile.role === 'parent') {
    // For parents, find their child (first student with matching parent email)
    const { data: studentData } = await supabase
      .from('students')
      .select('profile_id')
      .eq('parent_email', profile.email)
      .limit(1)
      .single()
    studentId = studentData?.profile_id || profile.id
  }

  // Get student info
  const { data: studentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .single()

  const { data: studentRecord } = await supabase
    .from('students')
    .select('*')
    .eq('profile_id', studentId)
    .single()

  // Fetch student's data
  const [consultationsData, applicationsData, schedulesData, paymentsData] = await Promise.all([
    // Recent consultations
    supabase
      .from('consultations')
      .select(
        `
        id,
        student_id,
        teacher_id,
        consultation_date,
        topics,
        created_at
      `
      )
      .eq('student_id', studentId)
      .order('consultation_date', { ascending: false })
      .limit(5),

    // University applications
    supabase
      .from('university_applications')
      .select('*')
      .eq('student_id', studentId)
      .order('application_date', { ascending: false }),

    // Upcoming schedules
    supabase
      .from('schedules')
      .select(
        `
        id,
        start_time,
        end_time,
        subject,
        room,
        updated_at,
        student_id,
        teacher_id
      `
      )
      .eq('student_id', studentId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(10),

    // Payment records
    supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('payment_date', { ascending: false }),
  ])

  // Calculate payment stats
  const payments = paymentsData.data || []
  const completedPayments = payments.filter((p) => p.status === 'completed')
  const pendingPayments = payments.filter((p) => p.status === 'pending')
  const overduePayments = pendingPayments.filter((p) => new Date(p.due_date) < new Date())

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const paidAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0)
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0)
  const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0)

  // Fetch teacher details for consultations
  const teacherIds = (consultationsData.data || []).map((c) => c.teacher_id)
  const { data: teacherDetails } =
    teacherIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, name')
          .in('id', teacherIds)
      : Promise.resolve({ data: [] })

  const teacherMap = new Map(
    (teacherDetails || []).map((t: { id: string; name: string }) => [t.id, t.name])
  )

  const enrichedConsultations = (consultationsData.data || []).map((c) => ({
    ...c,
    student: { name: studentProfile?.name || '학생' },
    teacher: { name: teacherMap.get(c.teacher_id) || '강사' },
  }))

  // Fetch schedule teacher details
  const scheduleTeacherIds = (schedulesData.data || []).map((s) => s.teacher_id)
  const { data: scheduleTeachers } =
    scheduleTeacherIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, name')
          .in('id', scheduleTeacherIds)
      : Promise.resolve({ data: [] })

  const scheduleTeacherMap = new Map(
    (scheduleTeachers || []).map((t: { id: string; name: string }) => [t.id, t.name])
  )

  const enrichedSchedules = (schedulesData.data || []).map((s) => ({
    ...s,
    student: { name: studentProfile?.name || '학생' },
    teacher: { name: scheduleTeacherMap.get(s.teacher_id) || '강사' },
  }))

  return (
    <main className="space-y-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {profile.role === 'parent' ? '학부모 대시보드' : '학생 대시보드'}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {studentProfile?.name}님의 학습 진행상황을 확인하세요.
          </p>
        </div>
      </div>

      {/* Child Info Card */}
      {studentRecord && (
        <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-6 dark:border-gray-800 dark:from-indigo-950/20 dark:to-blue-950/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">자녀 정보</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {studentProfile?.name}
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">학교</p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                    {studentRecord.school || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">학년</p>
                  <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                    {studentRecord.grade ? `${studentRecord.grade}학년` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">상태</p>
                  <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    {studentRecord.status === 'active' ? '재학중' : '휴학'}
                  </p>
                </div>
              </div>
            </div>
            <User className="h-12 w-12 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={MessageSquare}
          title="상담 기록"
          value={enrichedConsultations.length}
          variant="info"
        />
        <StatsCard
          icon={GraduationCap}
          title="지원 현황"
          value={(applicationsData.data || []).length}
          variant="warning"
        />
        <StatsCard
          icon={CreditCard}
          title="결제 현황"
          value={`${completedPayments.length}/${payments.length}`}
          variant="success"
        />
        <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 dark:border-blue-800 dark:from-blue-950/20 dark:to-cyan-950/20">
          <p className="text-sm text-gray-600 dark:text-gray-400">미결제 금액</p>
          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {(pendingAmount / 10000).toFixed(0)}만원
          </p>
          {overdueAmount > 0 && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              연체: {(overdueAmount / 10000).toFixed(0)}만원
            </p>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <UpcomingSchedules schedules={enrichedSchedules} />
          <RecentConsultations consultations={enrichedConsultations} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ApplicationStatus applications={applicationsData.data || []} />
          <PaymentSummary
            payments={payments.slice(0, 5)}
            totalAmount={totalAmount}
            paidAmount={paidAmount}
            pendingAmount={pendingAmount}
            overdueAmount={overdueAmount}
          />
        </div>
      </div>
    </main>
  )
}
