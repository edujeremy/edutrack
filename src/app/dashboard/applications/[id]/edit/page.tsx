'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ApplicationForm } from '@/components/applications/ApplicationForm'
import { Profile, Student } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function EditApplicationPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { toast } = useToast()

  const [application, setApplication] = useState<any>(null)
  const [students, setStudents] = useState<(Student & { profile: Profile })[]>(
    []
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()

        // Fetch application
        const { data: applicationData } = await supabase
          .from('university_applications')
          .select(
            `
            *,
            student:students(id, profile:profiles(id, name, email, avatar_url))
          `
          )
          .eq('id', id)
          .maybeSingle()

        setApplication(applicationData)

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
  }, [id, toast])

  const handleSubmit = async (data: any) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('university_applications')
      .update(data)
      .eq('id', id)

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

  if (!application) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">지원 기록을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/applications/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">지원 현황 편집</h1>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <ApplicationForm
          students={students}
          onSubmit={handleSubmit}
          initialData={application}
        />
      </div>
    </div>
  )
}
