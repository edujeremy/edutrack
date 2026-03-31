'use client'

import { formatTime, isToday, formatDate } from '@/lib/utils'
import type { Schedule } from '@/lib/types'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UpcomingSchedulesProps {
  schedules: Array<
    Schedule & {
      student?: { name: string }
      teacher?: { name: string }
    }
  >
  loading?: boolean
}

export function UpcomingSchedules({
  schedules,
  loading = false,
}: UpcomingSchedulesProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
          다가오는 일정
        </h2>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    )
  }

  if (schedules.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
          다가오는 일정
        </h2>
        <div className="flex flex-col items-center justify-center py-12">
          <Calendar className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">예정된 수업이 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
        다가오는 일정
      </h2>
      <div className="space-y-3">
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            className={cn(
              'flex items-center gap-4 rounded-lg border p-4 transition-colors',
              isToday(schedule.updated_at)
                ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30'
                : 'border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800'
            )}
          >
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                </p>
                {isToday(schedule.updated_at) && (
                  <span className="inline-block rounded-full bg-indigo-600 px-2 py-1 text-xs font-semibold text-white">
                    오늘
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {schedule.student?.name || '학생'} - {schedule.subject}
              </p>
              {schedule.room && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  강의실: {schedule.room}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-gray-500 dark:text-gray-400">
              강사: {schedule.teacher?.name || '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
