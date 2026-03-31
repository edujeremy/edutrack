'use client'

import React from 'react'
import { Payment } from '@/lib/types'
import { DollarSign, CheckCircle, Clock, AlertCircle, RotateCcw } from 'lucide-react'

interface PaymentStatsProps {
  payments: Payment[]
}

const formatKrw = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
  }).format(amount)
}

export const PaymentStats: React.FC<PaymentStatsProps> = ({ payments }) => {
  const stats = {
    total: payments.reduce((sum, p) => sum + p.amount, 0),
    completed: payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0),
    pending: payments
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0),
    overdue: payments
      .filter(
        (p) =>
          p.status === 'pending' &&
          new Date(p.due_date) < new Date()
      )
      .reduce((sum, p) => sum + p.amount, 0),
    refunded: payments
      .filter((p) => p.status === 'refunded')
      .reduce((sum, p) => sum + p.amount, 0),
  }

  const statItems = [
    {
      label: '총 매출',
      value: formatKrw(stats.total),
      icon: DollarSign,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: '결제 완료',
      value: formatKrw(stats.completed),
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: '대기중',
      value: formatKrw(stats.pending),
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      label: '연체',
      value: formatKrw(stats.overdue),
      icon: AlertCircle,
      color: 'bg-red-100 text-red-600',
    },
    {
      label: '환불',
      value: formatKrw(stats.refunded),
      icon: RotateCcw,
      color: 'bg-gray-100 text-gray-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statItems.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  {stat.label}
                </p>
                <p className="text-lg font-bold text-gray-900 mt-2">
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
