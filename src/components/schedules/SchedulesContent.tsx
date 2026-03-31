'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { LayoutGrid, List } from 'lucide-react'
import { WeekView } from '@/components/schedules/WeekView'
import { ScheduleList } from '@/components/schedules/ScheduleList'
import { Schedule, Profile } from '@/lib/types'

interface SchedulesContentProps {
  schedules: (Schedule & { teacher: Profile })[]
  teachers: Profile[]
}

export const SchedulesContent: React.FC<SchedulesContentProps> = ({
  schedules,
  teachers,
}) => {
  const [viewMode, setViewMode] = useState<'week' | 'list'>('week')

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">일정 보기</h2>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'week' ? 'primary' : 'secondary'}
                size="sm"
                className="gap-2"
                onClick={() => setViewMode('week')}
              >
                <LayoutGrid className="w-4 h-4" />
                주간
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'secondary'}
                size="sm"
                className="gap-2"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
                목록
              </Button>
            </div>
          </div>
        </CardHeader>
        <div className="border-t border-gray-200">
          {schedules.length > 0 ? (
            viewMode === 'week' ? (
              <WeekView schedules={schedules} teachers={teachers} />
            ) : (
              <ScheduleList schedules={schedules} />
            )
          ) : (
            <div className="py-12 text-center px-6">
              <p className="text-gray-500">등록된 일정이 없습니다</p>
              <Link href="/dashboard/schedules/new" className="mt-4 inline-block">
                <Button variant="primary">첫 일정 추가</Button>
              </Link>
            </div>
          )}
        </div>
      </Card>
    </>
  )
}
