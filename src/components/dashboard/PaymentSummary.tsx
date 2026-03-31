'use client'

import { formatCurrency, formatDistanceFromNow } from '@/lib/utils'
import type { Payment } from '@/lib/types'
import { CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaymentSummaryProps {
  payments: Payment[]
  totalAmount?: number
  paidAmount?: number
  pendingAmount?: number
  overdueAmount?: number
  loading?: boolean
}

const statusLabels: Record<string, string> = {
  pending: '미결제',
  completed: '완료',
  failed: '실패',
  refunded: '환불',
}

const statusBgColor = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

export function PaymentSummary({
  payments,
  totalAmount = 0,
  paidAmount = 0,
  pendingAmount = 0,
  overdueAmount = 0,
  loading = false,
}: PaymentSummaryProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
          결제 내역
        </h2>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-4 dark:from-blue-950/20 dark:to-indigo-950/20">
          <p className="text-xs text-gray-600 dark:text-gray-400">총액</p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-green-50 p-4 dark:from-emerald-950/20 dark:to-green-950/20">
          <p className="text-xs text-gray-600 dark:text-gray-400">완료</p>
          <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(paidAmount)}
          </p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:from-amber-950/20 dark:to-orange-950/20">
          <p className="text-xs text-gray-600 dark:text-gray-400">미결제</p>
          <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(pendingAmount)}
          </p>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-red-50 to-rose-50 p-4 dark:from-red-950/20 dark:to-rose-950/20">
          <p className="text-xs text-gray-600 dark:text-gray-400">연체</p>
          <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">
            {formatCurrency(overdueAmount)}
          </p>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
          최근 결제
        </h3>
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CreditCard className="mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">결제 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.slice(0, 5).map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {payment.description || '결제'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceFromNow(payment.payment_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(payment.amount)}
                  </p>
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-1 text-xs font-semibold',
                      statusBgColor[payment.status as keyof typeof statusBgColor]
                    )}
                  >
                    {statusLabels[payment.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
