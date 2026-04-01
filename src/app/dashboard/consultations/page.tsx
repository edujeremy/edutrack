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
import { ConsultationCard } from '@/components/consultations/ConsultationCard'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<{
    type?: string
    teacher?: string
    search?: string
    page?: string
  }>
}

export default async function ConsultationsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const pageSize = 12
  const currentPage = parseInt(params.page || '1')
  const offset = (currentPage - 1) * pageSize

  const filterType = params.type || ''
  const filterTeacher = params.teacher || ''
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
    .from('consultations')
    .select(
      `
      *,
      student:students(id, profile:profiles(id, name, email, avatar_url)),
      teacher:profiles(id, name, email, avatar_url)
    `,
      { count: 'exact' }
    )
    .order('consultation_date', { ascending: false })

  if (filterType) {
    query = query.contains('topics', [filterType])
  }

  if (searchQuery) {
    // We'll filter in memory for name search
  }

  const { data: consultations, count } = await query.range(
    offset,
    offset + pageSize - 1
  )

  // Filter by search query in memory
  let filtered = consultations || []
  if (searchQuery) {
    filtered = filtered.filter((c) =>
      (c.student?.profile?.name || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
  }

  if (filterTeacher) {
    filtered = filtered.filter((c) => c.teacher.id === filterTeacher)
  }

  // Get unique teachers for filter dropdown
  const allConsultations = await supabase
    .from('consultations')
    .select('teacher:profiles(id, name)')

  const uniqueTeachers = Array.from(
    new Map(
      (allConsultations.data || [])
        .map((c) => [c.teacher.id, c.teacher])
        .entries()
    ).values()
  )

  const totalPages = Math.ceil((count || 0) / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">상담 기록</h1>
        <Link href="/dashboard/consultations/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            상담 추가
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border">
        <div>
          <label className="text-sm font-medium block mb-2">상담 유형</label>
          <Select defaultValue={filterType}>
            <SelectTrigger>
              <SelectValue placeholder="상담 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              <SelectItem value="초기상담">초기상담</SelectItem>
              <SelectItem value="정기상담">정기상담</SelectItem>
              <SelectItem value="긴급상담">긴급상담</SelectItem>
              <SelectItem value="입시전략">입시전략</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">선생님</label>
          <Select defaultValue={filterTeacher}>
            <SelectTrigger>
              <SelectValue placeholder="선생님" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              {uniqueTeachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-2">학생 검색</label>
          <Input
            placeholder="학생명으로 검색..."
            defaultValue={searchQuery}
            type="search"
          />
        </div>
      </div>

      {/* Consultation List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">상담 기록이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((consultation) => (
              <ConsultationCard
                key={consultation.id}
                consultation={consultation}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-6">
              {currentPage > 1 && (
                <Link
                  href={`/dashboard/consultations?page=${currentPage - 1}${
                    filterType ? `&type=${filterType}` : ''
                  }${filterTeacher ? `&teacher=${filterTeacher}` : ''}${
                    searchQuery ? `&search=${searchQuery}` : ''
                  }`}
                >
                  <Button variant="outline">이전</Button>
                </Link>
              )}

              {Array.from({ length: totalPages }).map((_, i) => (
                <Link
                  key={i + 1}
                  href={`/dashboard/consultations?page=${i + 1}${
                    filterType ? `&type=${filterType}` : ''
                  }${filterTeacher ? `&teacher=${filterTeacher}` : ''}${
                    searchQuery ? `&search=${searchQuery}` : ''
                  }`}
                >
                  <Button
                    variant={currentPage === i + 1 ? 'default' : 'outline'}
                    size="sm"
                  >
                    {i + 1}
                  </Button>
                </Link>
              ))}

              {currentPage < totalPages && (
                <Link
                  href={`/dashboard/consultations?page=${currentPage + 1}${
                    filterType ? `&type=${filterType}` : ''
                  }${filterTeacher ? `&teacher=${filterTeacher}` : ''}${
                    searchQuery ? `&search=${searchQuery}` : ''
                  }`}
                >
                  <Button variant="outline">다음</Button>
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
