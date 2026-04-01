import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { RecentConsultations } from '@/components/dashboard/RecentConsultations'
import { UpcomingSchedules } from '@/components/dashboard/UpcomingSchedules'
import { PaymentSummary } from '@/components/dashboard/PaymentSummary'
import {
  Users,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Plus,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboardPage() {
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
    .maybeSingle()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    redirect('/dashboard')
  }

  // Fetch dashboard data in parallel
  const [studentsData, activeConsultationsData, paymentsData, schedulesData, consultationsData] =
    await Promise.all([
      // Total active students
      supabase
        .from('students')
        .select('id', { count: 'exact' })
        .eq('status', 'active'),

      // Active consultations (this month)
      supabase.rpc('get_active_consultations_count'),

      // Payments data
      supabase.from('payments').select('*').order('payment_date', { ascending: false }).limit(100),

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
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(5),

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
        .order('consultation_date', { ascending: false })
        .limit(5),
    ])

  const totalStudents = studentsData.count || 0
  const activeConsultations = 0 // Fallback, rpc might not exist

  // Calculate payment stats
  const completedPayments = (paymentsData.data || []).filter((p) => p.status === 'completed')
  const pendingPayments = (paymentsData.data || []).filter((p) => p.status === 'pending')
  const overduePayments = (paymentsData.data || []).filter((p) => {
    if (p.status === 'pending') {
      return new Date(p.due_date) < new Date()
    }
    return false
  })

  const totalAmount = (paymentsData.data || []).reduce((sum, p) => sum + p.amount, 0)
  const paidAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0)
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0)
  const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0)

  // Fetch student and teacher details for consultations
  const consultationIds = (consultationsData.data || []).map((c) => c.student_id)
  const teacherIds = (consultationsData.data || []).map((c) => c.teacher_id)

  const [studentDetails, teacherDetails] = await Promise.all([
    consultationIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, name')
          .in('id', consultationIds)
      : Promise.resolve({ data: [] }),
    teacherIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, name')
          .in('id', teacherIds)
      : Promise.resolve({ data: [] }),
  ])

  const studentMap = new Map(
    (studentDetails.data || []).map((s: { id: string; name: string }) => [s.id, s.name])
  )
  const teacherMap = new Map(
    (teacherDetails.data || []).map((t: { id: string; name: string }) => [t.id, t.name])
  )

  // Fetch schedule details
  const scheduleStudentIds = (schedulesData.data || []).map((s) => s.student_id)
  const scheduleTeacherIds = (schedulesData.data || []).map((s) => s.teacher_id)

  const [scheduleStudents, scheduleTeachers] = await Promise.all([
    scheduleStudentIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, name')
          .in('id', scheduleStudentIds)
      : Promise.resolve({ data: [] }),
    scheduleTeacherIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, name')
          .in('id', scheduleTeacherIds)
      : Promise.resolve({ data: [] }),
  ])

  const scheduleStudentMap = new Map(
    (scheduleStudents.data || []).map((s: { id: string; name: string }) => [s.id, s.name])
  )
  const scheduleTeacherMap = new Map(
    (scheduleTeachers.data || []).map((t: { id: string; name: string }) => [t.id, t.name])
  )

  const enrichedConsultations = (consultationsData.data || []).map((c) => ({
    ...c,
    student: { name: studentMap.get(c.student_id) || '학생' },
    teacher: { name: teacherMap.get(c.teacher_id) || '강사' },
  }))

  const enrichedSchedules = (schedulesData.data || []).map((s) => ({
    ...s,
    student: { name: scheduleStudentMap.get(s.student_id) || '학생' },
    teacher: { name: scheduleTeacherMap.get(s.teacher_id) || '강사' },
  }))

  return (
    <main className="space-y-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">관리자 대시보드</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">학원 전체 현황을 한눈에 확인하세요.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/consultations/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            상담 추가
          </Link>
          <Link
            href="/payments"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <BarChart3 className="h-4 w-4" />
            결제 현황
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Users}
          title="전체 학생 수"
          value={totalStudents}
          variant="default"
        />
        <StatsCard
          icon={MessageSquare}
          title="활성 상담"
          value={activeConsultations}
          changeLabel="이번 달"
          variant="info"
        />
        <StatsCard
          icon={TrendingUp}
          title="이번 달 매출"
          value={`${(paidAmount / 1000000).toFixed(1)}백만`}
          variant="success"
        />
        <StatsCard
          icon={AlertCircle}
          title="미결제 건수"
          value={pendingPayments.length}
          change={pendingAmount > 0 ? -Math.ceil((overdueAmount / pendingAmount) * 100) : 0}
          changeLabel="연체"
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <RecentConsultations consultations={enrichedConsultations} />
          <UpcomingSchedules schedules={enrichedSchedules} />
        </div>

        {/* Right Column */}
        <div>
          <PaymentSummary
            payments={(paymentsData.data || []).slice(0, 5)}
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
