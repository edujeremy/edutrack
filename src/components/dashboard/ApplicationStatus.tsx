'use client'

import { getStatusColor } from '@/lib/utils'
import type { UniversityApplication } from '@/lib/types'
import { GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApplicationStatusProps {
  applications: UniversityApplication[]
  loading?: boolean
}

const statusLabels: Record<string, string> = {
  draft: '작성중',
  submitted: '제출됨',
  accepted: '합격',
  rejected: '불합격',
  waitlisted: '대기중',
}

const statusBgColor = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  waitlisted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
}

export function ApplicationStatus({
  applications,
  loading = false,
}: ApplicationStatusProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
          지원 현황
        </h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
          지원 현황
        </h2>
        <div className="flex flex-col items-center justify-center py-12">
          <GraduationCap className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">대학 지원 기록이 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
        지원 현황
      </h2>
      <div className="space-y-3">
        {applications.map((application) => (
          <div
            key={application.id}
            className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">
                {application.university_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {application.major}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                지원일: {new Date(application.application_date).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div className="text-right">
              <span
                className={cn(
                  'inline-block rounded-full px-3 py-1 text-xs font-semibold',
                  statusBgColor[application.status as keyof typeof statusBgColor]
                )}
              >
                {statusLabels[application.status] || application.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
