'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StudentForm } from '@/components/students/StudentForm'
import { Profile, Student } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EditStudentPage() {
  const params = useParams()
  const studentId = params.id as string
  const [student, setStudent] = useState<(Student & { profile: Profile }) | null>(null)
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [parents, setParents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()

        // Fetch student data
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select(
            `
            *,
            profiles:profile_id (*)
          `
          )
          .eq('id', studentId)
          .maybeSingle()

        if (studentError || !studentData) {
          setError('학생을 찾을 수 없습니다.')
          return
        }

        setStudent(studentData)

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
  }, [studentId])

  const handleSubmit = async (formData: any) => {
    if (!student) return

    try {
      const supabase = createClient()

      // Validate grade
      let grade: number | null = null
      if (formData.grade) {
        const parsedGrade = parseInt(formData.grade)
        if (isNaN(parsedGrade)) {
          throw new Error('학년은 숫자여야 합니다.')
        }
        grade = parsedGrade
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
        })
        .eq('id', student.profile_id)

      if (profileError) throw profileError

      // Update student
      const { error: studentError } = await supabase
        .from('students')
        .update({
          school: formData.school || null,
          grade: grade,
          parent_name: formData.parent_name || null,
          parent_phone: formData.parent_phone || null,
          parent_email: formData.parent_email || null,
          teacher_id: formData.teacher_id || null,
        })
        .eq('id', studentId)

      if (studentError) throw studentError
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : '학생 정보를 수정할 수 없습니다.'
      )
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

  if (!student) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        학생을 찾을 수 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/students/${studentId}`}
            className="inline-flex items-center gap-2 text-blue-600 transition-colors hover:text-blue-700"
          >
            <ArrowLeft className="h-5 w-5" />
            돌아가기
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            {student.profile.name} 수정
          </h1>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <StudentForm
          initialData={student}
          teachers={teachers}
          parents={parents}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
