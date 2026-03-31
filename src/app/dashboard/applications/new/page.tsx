'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ApplicationForm } from '@/components/applications/ApplicationForm'
import { Profile, Student } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

export default function NewApplicationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [students, setStudents] = useState<(Student & { profile: Profile })[]>(
    []
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()

        // Fetch students
        const { data: studentsData } = await supabase
          .from('students')
          .select('*, profile:profiles(*)')
          .eq('status', 'active')

        setStudents(studentsData || [])
      } catch (error) {
        toast({
          title: '오류',
          description: '데이터를 불러올 수 없습니다.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast])

  const handleSubmit = async (data: any) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('university_applications')
      .insert([data])

    if (error) {
      throw new Error(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">대학교 지원 추가</h1>
      <div className="bg-white p-6 rounded-lg border">
        <ApplicationForm
          students={students}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
