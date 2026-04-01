'use client'

import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Schedule, Profile } from '@/lib/types'

interface WeekViewProps {
  schedules: (Schedule & { teacher: Profile })[]
  onScheduleClick?: (schedule: Schedule) => void
  teachers?: Profile[]
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 9) // 9:00 - 21:00
const COLORS = [
  'bg-red-100 border-red-300',
  'bg-blue-100 border-blue-300',
  'bg-green-100 border-green-300',
  'bg-yellow-100 border-yellow-300',
  'bg-purple-100 border-purple-300',
  'bg-pink-100 border-pink-300',
  'bg-cyan-100 border-cyan-300',
]

export const WeekView: React.FC<WeekViewProps> = ({
  schedules,
  onScheduleClick,
  teachers,
}) => {
  const [weekOffset, setWeekOffset] = useState(0)

  const currentDate = useMemo(() => {
    const today = new Date()
    const start = new Date(today)
    // Monday-first week (Korean locale): 0 = Monday, 6 = Sunday
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    start.setDate(diff + weekOffset * 7)
    return start
  }, [weekOffset])

  const weekEnd = useMemo(() => {
    const end = new Date(currentDate)
    end.setDate(currentDate.getDate() + 6)
    return end
  }, [currentDate])

  const getTeacherColor = (teacherId: string, idx: number) => {
    const colorMap = teachers?.reduce((acc, teacher, i) => {
      acc[teacher.id] = COLORS[i % COLORS.length]
      return acc
    }, {} as Record<string, string>) || {}
    return colorMap[teacherId] || COLORS[idx % COLORS.length]
  }

  const getSchedulesForSlot = (dayOfWeek: number, hour: number) => {
    return schedules.filter((s) => {
      if (s.day_of_week !== dayOfWeek || !s.is_active) return false
      const [startHour] = (s.start_time || '09:00').split(':').map(Number)
      const [endHour] = (s.end_time || '10:00').split(':').map(Number)
      return startHour <= hour && hour < endHour
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">
          {currentDate.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}{' '}
          -{' '}
          {weekEnd.toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
          })}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset(weekOffset - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setWeekOffset(0)}
          >
            이번주
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset(weekOffset + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-16 h-12 border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700">
                시간
              </th>
              {DAYS.map((day, idx) => {
                const date = new Date(currentDate)
                date.setDate(currentDate.getDate() + idx)
                return (
                  <th
                    key={day}
                    className="h-12 border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 p-2"
                  >
                    <div>{day}</div>
                    <div className="text-xs text-gray-500">
                      {formatDate(date)}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour}>
                <td className="w-16 border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 text-center">
                  {hour}:00
                </td>
                {DAYS.map((_, dayIdx) => {
                  const daySchedules = getSchedulesForSlot(dayIdx, hour)
                  return (
                    <td
                      key={`${hour}-${dayIdx}`}
                      className="border border-gray-200 h-14 p-1 align-top"
                    >
                      <div className="space-y-1">
                        {daySchedules.map((schedule, idx) => (
                          <div
                            key={schedule.id}
                            onClick={() => onScheduleClick?.(schedule)}
                            className={`text-xs p-1 rounded border cursor-pointer hover:shadow-md transition-shadow ${getTeacherColor(
                              schedule.teacher_id,
                              idx
                            )}`}
                          >
                            <div className="font-medium truncate">
                              {schedule.subject}
                            </div>
                            <div className="text-xs truncate">
                              {schedule.teacher.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
