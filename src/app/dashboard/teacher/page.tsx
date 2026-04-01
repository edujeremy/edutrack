import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { RecentConsultations } from '@/components/dashboard/RecentConsultations'
import { UpcomingSchedules } from '@/components/dashboard/UpcomingSchedules'
import { ApplicationStatus } from '@/components/dashboard/ApplicationStatus'
import { Users, Clock, MessageSquare, GraduationCap, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function TeacherDashboardPage() {
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

  if (!profile || profile.role !== 'teacher') {
    redirect('/dashboard')
  }

  // Fetch teacher's data
  const [studentsData, schedulesData, consultationsData, applicationsData] = await Promise.all([
    // My students count
    supabase
      .from('schedules')
      .select('student_id', { count: 'exact' })
      .eq('teacher_id', profile.id)
      .eq('is_active', true),

    // Today's schedule
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
      .eq('teacher_id', profile.id)
      .eq('is_active', true)
      .order('start_time', { ascending: true })
      .limit(10),

    // Recent consultations for teacher's students
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
      .eq('teacher_id', profile.id)
      .order('consultation_date', { ascending: false })
      .limit(5),

    // University applications for teacher's students
    supabase
      .from('schedules')
      .select('student_id')
      .eq('teacher_id', profile.id)
      .eq('is_active', true),
  ])

  const studentCount = studentsData.count || 0

  // Get applications for teacher's students
  const studentIds = (applicationsData.data || []).map((s) => s.student_id)
  const applicationsResult =
    studentIds.length > 0
      ? await supabase
          .from('university_applications')
          .select('*')
          .in('student_id', studentIds)
          .order('application_date', { ascending: false })
      : { data: [] }

  // Fetch student and teacher names for consultations and schedules
  const consultationStudentIds = (consultationsData.data || []).map((c) => c.student_id)
  const scheduleStudentIds = (schedulesData.data || []).map((s) => s.student_id)

  const [studentDetails, consultationTeachers] = await Promise.all([
    [...new Set([...consultationStudentIds, ...scheduleStudentIds])].length > 0
      ? supabase
          .from('profiles')
          .select('id, name')
          .in('id', [...new Set([...consultationStudentIds, ...scheduleStudentIds])])
      : Promise.resolve({ data: [] }),
    consultationStudentIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, name')
          .eq('id', profile.id)
      : Promise.resolve({ data: [] }),
  ])

  const studentMap = new Map(
    (studentDetails.data || []).map((s: { id: string; name: string }) => [s.id, s.name])
  )

  const enrichedConsultations = (consultationsData.data || []).map((c) => ({
    ...c,
    student: { name: studentMap.get(c.student_id) || '학생' },
    teacher: { name: profile.name },
  }))

  const enrichedSchedules = (schedulesData.data || []).map((s) => ({
    ...s,
    student: { name: studentMap.get(s.student_id) || '학생' },
    teacher: { name: profile.name },
  }))

  return (
    <main className="space-y-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">강사 대시보드</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {profile.name}님, 오늘도 화이팅하세요!
          </p>
        </div>
        <Link
          href="/dashboard/consultations/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          상담 추가
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={Users} title="내 학생" value={studentCount} variant="default" />
        <StatsCard
          icon={Clock}
          title="오늘 일정"
          value={enrichedSchedules.length}
          variant="info"
        />
        <StatsCard
          icon={MessageSquare}
          title="상담 기록"
          value={enrichedConsultations.length}
          variant="success"
        />
        <StatsCard
          icon={GraduationCap}
          title="지원 현황"
          value={(applicationsResult.data || []).length}
          variant="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <UpcomingSchedules schedules={enrichedSchedules} />
          <RecentConsultations consultations={enrichedConsultations} />
        </div>

        {/* Right Column */}
        <div>
          <ApplicationStatus applications={applicationsResult.data || []} />
        </div>
      </div>
    </main>
  )
}
