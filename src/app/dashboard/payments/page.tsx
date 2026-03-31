import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Plus, Download } from 'lucide-react'
import { PaymentStats } from '@/components/payments/PaymentStats'
import { PaymentTable } from '@/components/payments/PaymentTable'

export default async function PaymentsPage() {
  const supabase = await createClient()

  // Fetch payments with student information
  const { data: payments } = await supabase
    .from('payments')
    .select(
      `
      *,
      student:profiles!student_id(*)
    `
    )
    .order('created_at', { ascending: false })

  const typedPayments =
    payments?.map((p: any) => ({
      ...p,
      student: p.student || { id: '', name: '미정', email: '', role: 'student' },
    })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">결제 관리</h1>
          <p className="text-gray-600 mt-1">
            전체 {typedPayments.length}건의 결제 기록
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            내보내기
          </Button>
          <Link href="/dashboard/payments/new">
            <Button variant="primary" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              결제 추가
            </Button>
          </Link>
        </div>
      </div>

      <PaymentStats payments={typedPayments} />

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">결제 현황</h2>
        </CardHeader>
        <div className="border-t border-gray-200">
          {typedPayments.length > 0 ? (
            <PaymentTable payments={typedPayments} />
          ) : (
            <div className="py-12 text-center">
              <p className="text-gray-500">결제 기록이 없습니다</p>
              <Link href="/dashboard/payments/new" className="mt-4 inline-block">
                <Button variant="primary">첫 결제 추가</Button>
              </Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
