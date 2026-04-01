import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentFilters } from '@/components/students/StudentFilters'
import { StudentTable } from '@/components/students/StudentTable'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    teacher?: string
    page?: string
  }>
}

const ITEMS_PER_PAGE = 10

async function StudentListContent({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch teachers for filter dropdown
  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, name')
    .in('role', ['teacher', 'admin'])

  // Build query with filters
  let query = supabase
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
      teacher:teacher_id (id, name) | teachers!students_teacher_id_fkey (id, name)
    `,
      { count: 'exact' }
    )

  // Apply filters
  if (params.search) {
    const searchTerm = params.search.toLowerCase()
    query = query.or(
      `profiles.name.ilike.%${searchTerm}%,school.ilike.%${searchTerm}%`
    )
  }

  if (params.status) {
    query = query.eq('status', params.status)
  }

  if (params.teacher) {
    query = query.eq('teacher_id', params.teacher)
  }

  // Get paginated results
  const page = parseInt(params.page || '1', 10)
  const from = (page - 1) * ITEMS_PER_PAGE
  const to = from + ITEMS_PER_PAGE - 1

  const { data: students, count, error } = await query
    .order('enrollment_date', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching students:', error)
    throw new Error('학생 목록을 불러올 수 없습니다.')
  }

  // Create teacher map for easy lookup
  const teacherMap = new Map<string, string>()
  ;(teachers || []).forEach((teacher: any) => {
    teacherMap.set(teacher.id, teacher.name)
  })

  // Format students data
  const formattedStudents = (students || []).map((student: any) => ({
    ...student,
    profile: student.profiles,
    teacher: student.teacher,
  }))

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE)
  const canAddStudent = ['admin', 'manager', 'teacher'].includes(
    userProfile?.role || ''
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold text-gray-900">학생 관리</h1>
        {canAddStudent && (
          <Link
            href="/dashboard/students/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            학생 추가
          </Link>
        )}
      </div>

      {/* Filters */}
      <StudentFilters teachers={teachers || []} />

      {/* Table */}
      <StudentTable students={formattedStudents} teachers={teacherMap} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 {count || 0}명 중 {from + 1}-{Math.min(to + 1, count || 0)}명 표시
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?${new URLSearchParams({
                  ...params,
                  page: String(page - 1),
                }).toString()}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                이전
              </Link>
            )}
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1
                return (
                  <Link
                    key={pageNum}
                    href={`?${new URLSearchParams({
                      ...params,
                      page: String(pageNum),
                    }).toString()}`}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </Link>
                )
              })}
            </div>
            {page < totalPages && (
              <Link
                href={`?${new URLSearchParams({
                  ...params,
                  page: String(page + 1),
                }).toString()}`}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                다음
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StudentListPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
        </div>
      }
    >
      <StudentListContent {...props} />
    </Suspense>
  )
}
