'use client'

import { Search, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface StudentFiltersProps {
  teachers: Array<{ id: string; name: string }>
}

type StudentStatus = '전체' | '활성' | '비활성' | '졸업' | '퇴원'

const statusOptions: { label: StudentStatus; value: string | null }[] = [
  { label: '전체', value: null },
  { label: '활성', value: 'active' },
  { label: '비활성', value: 'inactive' },
  { label: '졸업', value: 'graduated' },
  { label: '퇴원', value: 'withdrawn' },
]

export function StudentFilters({ teachers }: StudentFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSearch = searchParams.get('search') || ''
  const currentStatus = searchParams.get('status') || ''
  const currentTeacher = searchParams.get('teacher') || ''

  const updateFilters = useCallback(
    (updates: { search?: string; status?: string; teacher?: string }) => {
      const params = new URLSearchParams(searchParams)

      if (updates.search !== undefined) {
        if (updates.search) {
          params.set('search', updates.search)
        } else {
          params.delete('search')
        }
      }

      if (updates.status !== undefined) {
        if (updates.status) {
          params.set('status', updates.status)
        } else {
          params.delete('status')
        }
      }

      if (updates.teacher !== undefined) {
        if (updates.teacher) {
          params.set('teacher', updates.teacher)
        } else {
          params.delete('teacher')
        }
      }

      params.set('page', '1')
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ search: e.target.value })
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilters({ status: e.target.value })
  }

  const handleTeacherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateFilters({ teacher: e.target.value })
  }

  const clearFilters = () => {
    router.push('?page=1')
  }

  const hasActiveFilters = currentSearch || currentStatus || currentTeacher

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* 검색 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="이름, 학교로 검색"
            value={currentSearch}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 상태 필터 */}
        <select
          value={currentStatus}
          onChange={handleStatusChange}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {statusOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value || ''}>
              {option.label}
            </option>
          ))}
        </select>

        {/* 담당선생님 필터 */}
        <select
          value={currentTeacher}
          onChange={handleTeacherChange}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">담당선생님</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
      </div>

      {/* 필터 초기화 버튼 */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
        >
          <X className="h-4 w-4" />
          필터 초기화
        </button>
      )}
    </div>
  )
}
