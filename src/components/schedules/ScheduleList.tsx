'use client'

import React from 'react'
import { Clock, User, BookOpen } from 'lucide-react'
import { Schedule, Profile } from '@/lib/types'

interface ScheduleListProps {
  schedules: (Schedule & { teacher: Profile })[]
  onScheduleClick?: (schedule: Schedule) => void
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일']

export const ScheduleList: React.FC<ScheduleListProps> = ({
  schedules,
  onScheduleClick,
}) => {
  const sortedSchedules = [...schedules].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week
    }
    return a.start_time.localeCompare(b.start_time)
  })

  if (sortedSchedules.length === 0) {
    return (
      <div className="py-8">
        <div className="text-center text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>일정이 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4">
      {sortedSchedules.map((schedule) => (
        <div
          key={schedule.id}
          className="bg-white rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onScheduleClick?.(schedule)}
        >
          <div className="py-4 px-6 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {schedule.subject}
                  </h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {schedule.teacher?.name || '선생님'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {DAYS[schedule.day_of_week]} {schedule.start_time} ~{' '}
                      {schedule.end_time}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              {!schedule.is_active && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  비활성
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
