'use client'

import React, { useState } from 'react'
import { Schedule, Profile } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Loader2 } from 'lucide-react'

interface ScheduleFormProps {
  students: Profile[]
  teachers: Profile[]
  initialData?: Schedule & { teacher: Profile }
  onSubmit: (data: any) => Promise<void>
  isLoading?: boolean
}

const DAYS = [
  { value: 0, label: '월' },
  { value: 1, label: '화' },
  { value: 2, label: '수' },
  { value: 3, label: '목' },
  { value: 4, label: '금' },
  { value: 5, label: '토' },
  { value: 6, label: '일' },
]

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  students,
  teachers,
  initialData,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    student_id: initialData?.student_id || '',
    teacher_id: initialData?.teacher_id || '',
    subject: initialData?.subject || '',
    day_of_week: initialData?.day_of_week ?? 0,
    start_time: initialData?.start_time || '09:00',
    end_time: initialData?.end_time || '10:00',
    room: initialData?.room || '',
    is_active: initialData?.is_active ?? true,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-2xl font-bold text-gray-900">
          {initialData ? '일정 수정' : '일정 추가'}
        </h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                학생 선택 *
              </label>
              <select
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">학생을 선택하세요</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                선생님 선택 *
              </label>
              <select
                name="teacher_id"
                value={formData.teacher_id}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">선생님을 선택하세요</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                과목 *
              </label>
              <Input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="예: 수학, 영어"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                강의실
              </label>
              <Input
                type="text"
                name="room"
                value={formData.room}
                onChange={handleChange}
                placeholder="예: 101호"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                요일 *
              </label>
              <select
                name="day_of_week"
                value={formData.day_of_week}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {DAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  시작시간 *
                </label>
                <Input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종료시간 *
                </label>
                <Input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              활성화
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary">
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
