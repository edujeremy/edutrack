'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ScheduleForm } from '@/components/schedules/ScheduleForm'
import { Profile, Schedule } from '@/lib/types'

export default function EditSchedulePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [schedule, setSchedule] = useState<(Schedule & { teacher: Profile }) | null>(null)
  const [students, setStudents] = useState<Profile[]>([])
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = await createClient()

      const { data: scheduleData } = await supabase
        .from('schedules')
        .select(
          `
          *,
          teacher:profiles!teacher_id(*)
        `
        )
        .eq('id', id)
        .single()

      const { data: students } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['student', 'parent'])

      const { data: teachers } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')

      setSchedule(scheduleData as any)
      setStudents(students || [])
      setTeachers(teachers || [])
      setIsLoading(false)
    }

    fetchData()
  }, [id])

  const handleSubmit = async (formData: any) => {
    try {
      setIsLoading(true)
      const supabase = await createClient()

      const { error } = await supabase
        .from('schedules')
        .update({
          student_id: formData.student_id,
          teacher_id: formData.teacher_id,
          subject: formData.subject,
          day_of_week: parseInt(formData.day_of_week),
          start_time: formData.start_time,
          end_time: formData.end_time,
          room: formData.room || null,
          is_active: formData.is_active,
        })
        .eq('id', id)

      if (error) throw error

      router.push('/dashboard/schedules')
      router.refresh()
    } catch (error) {
      console.error('Error updating schedule:', error)
      alert('일정 수정에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !schedule) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <p className="mt-4 text-gray-600">로딩중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">일정 수정</h1>
        <p className="text-gray-600 mt-1">수업 일정 정보를 수정합니다</p>
      </div>

      <ScheduleForm
        students={students}
        teachers={teachers}
        initialData={schedule}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
