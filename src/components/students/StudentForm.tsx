'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile, Student } from '@/lib/types'
import { Loader2 } from 'lucide-react'

interface StudentFormProps {
  initialData?: Student & { profile: Profile }
  teachers: Profile[]
  parents: Profile[]
  onSubmit: (data: any) => Promise<void>
  isLoading?: boolean
}

export function StudentForm({
  initialData,
  teachers,
  parents,
  onSubmit,
  isLoading: externalIsLoading = false,
}: StudentFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: initialData?.profile.name || '',
    email: initialData?.profile.email || '',
    phone: initialData?.profile.phone || '',
    school: initialData?.school || '',
    grade: initialData?.grade || '',
    parent_name: initialData?.parent_name || '',
    parent_phone: initialData?.parent_phone || '',
    parent_email: initialData?.parent_email || '',
    target_university: '',
    teacher_id: '',
    notes: '',
  })

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('이름은 필수입니다.')
      }

      await onSubmit(formData)

      setFormData({
        name: '',
        email: '',
        phone: '',
        school: '',
        grade: '',
        parent_name: '',
        parent_phone: '',
        parent_email: '',
        target_university: '',
        teacher_id: '',
        notes: '',
      })

      router.push('/dashboard/students')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const loading = isLoading || externalIsLoading

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">기본정보</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* 이름 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              이름 *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 이메일 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              이메일
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 연락처 */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              연락처
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 학교 */}
          <div>
            <label htmlFor="school" className="block text-sm font-medium text-gray-700">
              학교
            </label>
            <input
              type="text"
              id="school"
              name="school"
              value={formData.school}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 학년 */}
          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
              학년
            </label>
            <select
              id="grade"
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">선택</option>
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </div>

          {/* 목표 대학 */}
          <div>
            <label htmlFor="target_university" className="block text-sm font-medium text-gray-700">
              목표 대학
            </label>
            <input
              type="text"
              id="target_university"
              name="target_university"
              value={formData.target_university}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">학부모정보</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* 학부모 이름 */}
          <div>
            <label htmlFor="parent_name" className="block text-sm font-medium text-gray-700">
              학부모 이름
            </label>
            <input
              type="text"
              id="parent_name"
              name="parent_name"
              value={formData.parent_name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 학부모 이메일 */}
          <div>
            <label htmlFor="parent_email" className="block text-sm font-medium text-gray-700">
              학부모 이메일
            </label>
            <input
              type="email"
              id="parent_email"
              name="parent_email"
              value={formData.parent_email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 학부모 연락처 */}
          <div>
            <label htmlFor="parent_phone" className="block text-sm font-medium text-gray-700">
              학부모 연락처
            </label>
            <input
              type="tel"
              id="parent_phone"
              name="parent_phone"
              value={formData.parent_phone}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 담당선생님 */}
          <div>
            <label htmlFor="teacher_id" className="block text-sm font-medium text-gray-700">
              담당선생님
            </label>
            <select
              id="teacher_id"
              name="teacher_id"
              value={formData.teacher_id}
              onChange={handleChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">선택</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 메모 */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          메모
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={4}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* 버튼 */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {initialData ? '수정' : '추가'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          취소
        </button>
      </div>
    </form>
  )
}
