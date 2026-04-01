import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApplicationTable } from '@/components/applications/ApplicationTable'
import { StatusSummary } from '@/components/applications/StatusSummary'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<{
    status?: string
    student?: string
    search?: string
    page?: string
  }>
}

export default async function ApplicationsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const filterStatus = params.status || ''
  const filterStudent = params.student || ''
  const searchQuery = params.search || ''

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Build query
  let query = supabase
    .from('university_applications')
    .select(
      `
      *,
      student:students(id, profile:profiles(id, name, email, avatar_url))
    `
    )
    .order('application_date', { ascending: false })

  if (filterStatus) {
    query = query.eq('status', filterStatus)
  }

  const { data: applications, error } = await query

  // Filter by student and search in memory
  let filtered = applications || []

  if (filterStudent) {
    filtered = filtered.filter((app) => app.student_id === filterStudent)
  }

  if (searchQuery) {
    filtered = filtered.filter(
      (app) =>
        app.university_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.major?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.student?.profile?.name || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
    )
  }

  // Get unique students for filter
  const allApplications = await supabase
    .from('university_applications')
    .select('student_id, student:students(id, profile:profiles(id, name))')

  const uniqueStudents = Array.from(
    new Map(
      (allApplications.data || [])
        .filter((app: any) => app.student?.profile?.name)
        .map((app: any) => [
          app.student_id,
          {
            id: app.student_id,
            name: app.student?.profile?.name || '학생',
          },
        ])
        .entries()
    ).values()
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">지원 현황</h1>
        <Link href="/dashboard/applications/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            지원 추가
          </Button>
        </Link>
      </div>

      {/* Status Summary */}
      <StatusSummary applications={applications || []} />

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border">
        <div>
          <label className="text-sm font-medium block mb-2">상태</label>
          <Select defaultValue={filterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              <SelectItem value="draft">준비중</SelectItem>
              <SelectItem value="submitted">제출완료</SelectItem>
              <SelectItem value="accepted">합격</SelectItem>
              <SelectItem value="rejected">불합격</SelectItem>
              <SelectItem value="waitlisted">대기중</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">학생</label>
          <Select defaultValue={filterStudent}>
            <SelectTrigger>
              <SelectValue placeholder="학생" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              {uniqueStudents.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">검색</label>
          <Input
            placeholder="대학교, 학과명으로 검색..."
            defaultValue={searchQuery}
            type="search"
          />
        </div>
      </div>

      {/* Application Table */}
      <div className="bg-white rounded-lg">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">지원 기록이 없습니다.</p>
          </div>
        ) : (
          <ApplicationTable applications={filtered} />
        )}
      </div>
    </div>
  )
}
