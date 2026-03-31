import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Plus } from 'lucide-react'
import { SchedulesContent } from '@/components/schedules/SchedulesContent'

export default async function SchedulesPage() {
  const supabase = await createClient()

  // Fetch schedules with teacher information
  const { data: schedules } = await supabase
    .from('schedules')
    .select(
      `
      *,
      teacher:profiles!teacher_id(*)
    `
    )
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time')

  // Fetch teachers for color coding
  const { data: teachers } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'teacher')

  const typedSchedules =
    schedules?.map((s: any) => ({
      ...s,
      teacher: s.teacher || { id: '', name: '미정', email: '', role: 'teacher' },
    })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">수업 일정</h1>
          <p className="text-gray-600 mt-1">
            전체 {typedSchedules.length}개의 일정
          </p>
        </div>
        <Link href="/dashboard/schedules/new">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            일정 추가
          </Button>
        </Link>
      </div>

      <SchedulesContent schedules={typedSchedules} teachers={teachers || []} />
    </div>
  )
}
