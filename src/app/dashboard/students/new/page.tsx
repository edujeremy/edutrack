'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StudentForm } from '@/components/students/StudentForm'
import { Profile } from '@/lib/types'
import { useRouter } from 'next/navigation'

export default function NewStudentPage() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [parents, setParents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()

        // Fetch teachers
        const { data: teachersData, error: teachersError } = await supabase
          .from('profiles')
          .select('*')
          .in('role', ['teacher', 'admin'])

        if (teachersError) throw teachersError

        // Fetch parents
        const { data: parentsData, error: parentsError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'parent')

        if (parentsError) throw parentsError

        setTeachers(teachersData || [])
        setParents(parentsData || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : '데이터를 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSubmit = async (formData: any) => {
    try {
      const supabase = createClient()

      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('로그인이 필요합니다.')
      }

      // Create profile for student first if needed
      // For this implementation, we'll assume profile exists or create a simple one
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            role: 'student' as const,
          },
        ])
        .select()
        .single()

      if (profileError) throw profileError

      // Create student record
      const { error: studentError } = await supabase.from('students').insert([
        {
          profile_id: profile.id,
          school: formData.school || null,
          grade: formData.grade ? parseInt(formData.grade) : null,
          parent_name: formData.parent_name || null,
          parent_phone: formData.parent_phone || null,
          parent_email: formData.parent_email || null,
          enrollment_date: new Date().toISOString().split('T')[0],
          status: 'active',
          teacher_id: formData.teacher_id || null,
        },
      ])

      if (studentError) throw studentError
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : '학생을 추가할 수 없습니다.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">학생 추가</h1>
        <p className="mt-2 text-gray-600">새로운 학생 정보를 입력하세요.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <StudentForm
          teachers={teachers}
          parents={parents}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
