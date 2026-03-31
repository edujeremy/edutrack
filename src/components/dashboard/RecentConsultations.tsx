'use client'

import { formatDistanceFromNow } from '@/lib/utils'
import type { Consultation } from '@/lib/types'
import { MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface RecentConsultationsProps {
  consultations: Array<
    Consultation & {
      student?: { name: string }
      teacher?: { name: string }
    }
  >
  loading?: boolean
}

export function RecentConsultations({
  consultations,
  loading = false,
}: RecentConsultationsProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
          최근 상담
        </h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    )
  }

  if (consultations.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
          최근 상담
        </h2>
        <div className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">상담 기록이 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
        최근 상담
      </h2>
      <div className="space-y-4">
        {consultations.map((consultation) => (
          <Link
            key={consultation.id}
            href={`/consultations/${consultation.id}`}
            className="block rounded-lg border border-gray-100 bg-gray-50 p-4 transition-colors hover:bg-indigo-50 dark:border-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {consultation.student?.name || '학생'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  강사: {consultation.teacher?.name || '-'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {consultation.topics?.slice(0, 2).map((topic, idx) => (
                    <span
                      key={idx}
                      className="inline-block rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                    >
                      {topic}
                    </span>
                  ))}
                  {consultation.topics && consultation.topics.length > 2 && (
                    <span className="inline-block text-xs text-gray-500 dark:text-gray-400">
                      +{consultation.topics.length - 2}개
                    </span>
                  )}
                </div>
              </div>
              <p className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                {formatDistanceFromNow(consultation.consultation_date)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
