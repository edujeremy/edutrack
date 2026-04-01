'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PaymentForm } from '@/components/payments/PaymentForm'
import { Profile, Payment } from '@/lib/types'

export default function EditPaymentPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [payment, setPayment] = useState<Payment | null>(null)
  const [students, setStudents] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = await createClient()

      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      const { data: studentsData } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['student', 'parent'])

      setPayment(paymentData)
      setStudents(studentsData || [])
      setIsLoading(false)
    }

    fetchData()
  }, [id])

  const handleSubmit = async (formData: any) => {
    try {
      setIsLoading(true)
      const supabase = await createClient()

      const { error } = await supabase
        .from('payments')
        .update({
          student_id: formData.student_id,
          amount: formData.amount,
          description: formData.description,
          due_date: formData.due_date,
          status: formData.status,
          payment_date:
            formData.status === 'completed' ? formData.payment_date : null,
        })
        .eq('id', id)

      if (error) throw error

      router.push(`/dashboard/payments/${id}`)
      router.refresh()
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('결제 정보 수정에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !payment) {
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
        <h1 className="text-3xl font-bold text-gray-900">결제 정보 수정</h1>
        <p className="text-gray-600 mt-1">결제 정보를 수정합니다</p>
      </div>

      <PaymentForm
        students={students}
        initialData={payment}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
