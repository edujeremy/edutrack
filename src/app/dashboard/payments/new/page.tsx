'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PaymentForm } from '@/components/payments/PaymentForm'
import { Profile } from '@/lib/types'

export default function NewPaymentPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStudents = async () => {
      const supabase = await createClient()
      const { data: students } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['student', 'parent'])

      setStudents(students || [])
      setIsLoading(false)
    }

    fetchStudents()
  }, [])

  const handleSubmit = async (formData: any) => {
    try {
      setIsLoading(true)
      const supabase = await createClient()

      const { error } = await supabase.from('payments').insert([
        {
          student_id: formData.student_id,
          amount: formData.amount,
          description: formData.description,
          due_date: formData.due_date,
          status: formData.status,
          payment_date:
            formData.status === 'completed' ? formData.payment_date : null,
          currency: 'KRW',
        },
      ])

      if (error) throw error

      router.push('/dashboard/payments')
      router.refresh()
    } catch (error) {
      console.error('Error creating payment:', error)
      alert('결제 추가에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
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
        <h1 className="text-3xl font-bold text-gray-900">새 결제 추가</h1>
        <p className="text-gray-600 mt-1">새로운 결제 기록을 추가합니다</p>
      </div>

      <PaymentForm
        students={students}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
