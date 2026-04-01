'use client'

import React, { useState } from 'react'
import { Payment, Profile } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Edit2, Eye } from 'lucide-react'
import Link from 'next/link'

interface PaymentTableProps {
  payments: (Payment & { student: Profile })[]
  onEdit?: (payment: Payment) => void
}

const formatKrw = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
  }).format(amount)
}

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; color: string }> = {
    completed: { label: '결제완료', color: 'bg-green-100 text-green-700' },
    pending: { label: '대기중', color: 'bg-yellow-100 text-yellow-700' },
    failed: { label: '실패', color: 'bg-red-100 text-red-700' },
    refunded: { label: '환불', color: 'bg-gray-100 text-gray-700' },
  }

  const config = statusMap[status] || statusMap.pending
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}

const isOverdue = (dueDate: string, status: string) => {
  return status === 'pending' && new Date(dueDate) < new Date()
}

export const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  onEdit,
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  }>({ key: 'created_at', direction: 'desc' })

  const sortedPayments = [...payments].sort((a, b) => {
    let aVal: any = a[sortConfig.key as keyof Payment]
    let bVal: any = b[sortConfig.key as keyof Payment]

    // Handle 'student' key specially since it's a nested object
    if (sortConfig.key === 'student') {
      aVal = a.student?.name || ''
      bVal = b.student?.name || ''
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortConfig.direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }

    return 0
  })

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  if (payments.length === 0) {
    return (
      <div className="py-8">
        <div className="text-center text-gray-500">
          <p>결제 기록이 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('student')}>
                  학생
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('amount')}>
                  금액
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                  설명
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('payment_date')}>
                  결제일
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('due_date')}>
                  납부기한
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}>
                  상태
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-700">
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPayments.map((payment) => (
                <tr
                  key={payment.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    isOverdue(payment.due_date, payment.status)
                      ? 'bg-red-50'
                      : ''
                  }`}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {payment.student.name}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                    {formatKrw(payment.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {payment.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {payment.payment_date
                      ? new Date(payment.payment_date).toLocaleDateString(
                          'ko-KR'
                        )
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(payment.due_date).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/payments/${payment.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/dashboard/payments/${payment.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit?.(payment)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
    </div>
  )
}
