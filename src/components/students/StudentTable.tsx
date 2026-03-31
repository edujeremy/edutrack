'use client'

import { Student, Profile } from '@/lib/types'
import { ChevronRight, Badge } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface StudentWithProfile extends Student {
  profile: Profile
  teacher?: Profile | null
}

interface StudentTableProps {
  students: StudentWithProfile[]
  teachers: Map<string, string>
}

const statusConfig = {
  active: { label: '활성', color: 'bg-green-100 text-green-800' },
  inactive: { label: '비활성', color: 'bg-gray-100 text-gray-800' },
  graduated: { label: '졸업', color: 'bg-blue-100 text-blue-800' },
  withdrawn: { label: '퇴원', color: 'bg-red-100 text-red-800' },
}

export function StudentTable({ students, teachers }: StudentTableProps) {
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  const sortedStudents = [...students].sort((a, b) => {
    if (!sortConfig) return 0

    let aValue: any = a
    let bValue: any = b

    if (sortConfig.key === 'profile.name') {
      aValue = a.profile.name
      bValue = b.profile.name
    } else if (sortConfig.key === 'teacher') {
      aValue = a.teacher?.name || ''
      bValue = b.teacher?.name || ''
    } else {
      aValue = (a as any)[sortConfig.key]
      bValue = (b as any)[sortConfig.key]
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const toggleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc'
          ? { key, direction: 'desc' }
          : { key: '', direction: 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
    <button
      onClick={() => toggleSort(sortKey)}
      className="inline-flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
    >
      {label}
      {sortConfig?.key === sortKey && (
        <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  )

  // Desktop view
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-sm">
                <SortHeader label="이름" sortKey="profile.name" />
              </th>
              <th className="px-6 py-3 text-left text-sm">
                <SortHeader label="학교" sortKey="school" />
              </th>
              <th className="px-6 py-3 text-left text-sm">
                <SortHeader label="학년" sortKey="grade" />
              </th>
              <th className="px-6 py-3 text-left text-sm">
                <SortHeader label="담당선생님" sortKey="teacher" />
              </th>
              <th className="px-6 py-3 text-left text-sm">
                <SortHeader label="상태" sortKey="status" />
              </th>
              <th className="px-6 py-3 text-left text-sm">
                <SortHeader label="등록일" sortKey="enrollment_date" />
              </th>
              <th className="relative px-6 py-3 text-sm">
                <span className="text-gray-700">보기</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((student) => (
              <tr
                key={student.id}
                className="border-b border-gray-200 transition-colors hover:bg-gray-50"
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {student.profile.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {student.school || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {student.grade ? `${student.grade}학년` : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {student.teacher?.name || '-'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      statusConfig[student.status as keyof typeof statusConfig]?.color ||
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {statusConfig[student.status as keyof typeof statusConfig]?.label ||
                      student.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(student.enrollment_date).toLocaleDateString('ko-KR')}
                </td>
                <td className="relative px-6 py-4 text-center">
                  <Link
                    href={`/dashboard/students/${student.id}`}
                    className="inline-flex items-center justify-center transition-colors hover:text-blue-600"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="space-y-4 md:hidden">
        {sortedStudents.map((student) => (
          <Link
            key={student.id}
            href={`/dashboard/students/${student.id}`}
            className="block rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{student.profile.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{student.school || '-'}</p>
                <div className="mt-2 flex items-center gap-2">
                  {student.grade && (
                    <span className="text-xs text-gray-500">{student.grade}학년</span>
                  )}
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                      statusConfig[student.status as keyof typeof statusConfig]?.color ||
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {statusConfig[student.status as keyof typeof statusConfig]?.label ||
                      student.status}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            {student.teacher && (
              <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
                담당선생님: {student.teacher.name}
              </p>
            )}
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {sortedStudents.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center">
          <Badge className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-600">등록된 학생이 없습니다.</p>
        </div>
      )}
    </>
  )
}
