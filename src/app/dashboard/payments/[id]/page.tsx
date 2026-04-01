'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Payment, Profile } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft, Calendar, DollarSign, User, FileText } from 'lucide-react'

interface PaymentWithStudent extends Payment {
  student: Profile
}

const formatKrw = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
  }).format(amount)
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    completed: 'bg-green-50 border-green-200',
    pending: 'bg-yellow-50 border-yellow-200',
    failed: 'bg-red-50 border-red-200',
    refunded: 'bg-gray-50 border-gray-200',
  }
  return colors[status] || colors.pending
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    completed: '결제완료',
    pending: '대기중',
    failed: '실패',
    refunded: '환불',
  }
  return labels[status] || status
}

export default function PaymentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [payment, setPayment] = useState<PaymentWithStudent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const fetchPayment = async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from('payments')
        .select(
          `
          *,
          student:profiles!student_id(*)
        `
        )
        .eq('id', id)
        .maybeSingle()

      setPayment(data as PaymentWithStudent)
      setIsLoading(false)
    }

    fetchPayment()
  }, [id])

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setIsUpdating(true)
      const supabase = await createClient()

      const updateData: any = { status: newStatus }

      if (newStatus === 'completed' && !payment?.payment_date) {
        updateData.payment_date = new Date().toISOString()
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      setPayment(
        (prev) =>
          prev && {
            ...prev,
            status: newStatus as any,
            payment_date: updateData.payment_date || prev.payment_date,
          }
      )
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('결제 상태 업데이트에 실패했습니다')
    } finally {
      setIsUpdating(false)
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

  if (!payment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">결제 정보를 찾을 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/payments" className="inline-flex items-center text-indigo-600 hover:text-indigo-700">
        <ArrowLeft className="w-4 h-4 mr-2" />
        돌아가기
      </Link>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">결제 상세</h1>
              <p className="text-gray-600 mt-1">
                {payment.student.name} - {formatKrw(payment.amount)}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg border ${getStatusColor(payment.status)}`}>
              <span className="font-medium text-gray-900">
                {getStatusLabel(payment.status)}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-4">학생 정보</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">이름</p>
                    <p className="font-medium text-gray-900">
                      {payment.student.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">이메일</p>
                    <p className="font-medium text-gray-900">
                      {payment.student.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-4">결제 정보</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">금액</p>
                    <p className="font-medium text-gray-900">
                      {formatKrw(payment.amount)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">납부기한</p>
                    <p className="font-medium text-gray-900">
                      {new Date(payment.due_date).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {payment.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">설명</h3>
              <p className="text-gray-600">{payment.description}</p>
            </div>
          )}

          {payment.payment_date && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">결제일</h3>
              <p className="text-gray-600">
                {new Date(payment.payment_date).toLocaleDateString('ko-KR')}
              </p>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">결제 상태 변경</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={payment.status === 'completed' ? 'primary' : 'secondary'}
                onClick={() => handleStatusUpdate('completed')}
                disabled={isUpdating}
              >
                결제 완료
              </Button>
              <Button
                variant={payment.status === 'pending' ? 'primary' : 'secondary'}
                onClick={() => handleStatusUpdate('pending')}
                disabled={isUpdating}
              >
                대기중
              </Button>
              <Button
                variant={payment.status === 'refunded' ? 'danger' : 'secondary'}
                onClick={() => handleStatusUpdate('refunded')}
                disabled={isUpdating}
              >
                환불
              </Button>
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t">
            <Link href={`/dashboard/payments/${payment.id}/edit`}>
              <Button variant="secondary">수정</Button>
            </Link>
            <Link href="/dashboard/payments">
              <Button variant="ghost">목록으로</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
