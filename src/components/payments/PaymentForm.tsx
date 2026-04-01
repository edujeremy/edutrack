'use client'

import React, { useState } from 'react'
import { Payment, Profile } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Loader2 } from 'lucide-react'

interface PaymentFormProps {
  students: Profile[]
  initialData?: Payment
  onSubmit: (data: any) => Promise<void>
  isLoading?: boolean
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '대기중' },
  { value: 'completed', label: '결제완료' },
  { value: 'failed', label: '실패' },
  { value: 'refunded', label: '환불' },
]

const formatKrwInput = (value: string) => {
  const numValue = value.replace(/[^\d]/g, '')
  if (!numValue) return ''
  return parseInt(numValue, 10).toLocaleString('ko-KR')
}

const parseKrwInput = (value: string) => {
  return parseInt(value.replace(/[^\d]/g, ''), 10) || 0
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  students,
  initialData,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    student_id: initialData?.student_id || '',
    amount: initialData?.amount.toLocaleString('ko-KR') || '',
    description: initialData?.description || '',
    due_date: initialData?.due_date ? initialData.due_date.split('T')[0] : '',
    status: initialData?.status || 'pending',
    payment_date: initialData?.payment_date ? initialData.payment_date.split('T')[0] : '',
  })

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatKrwInput(e.target.value)
    setFormData((prev) => ({
      ...prev,
      amount: formatted,
    }))
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      amount: parseKrwInput(formData.amount),
    }
    await onSubmit(submitData)
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-2xl font-bold text-gray-900">
          {initialData ? '결제 정보 수정' : '결제 추가'}
        </h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                학생 선택 *
              </label>
              <select
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">학생을 선택하세요</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                금액 (원) *
              </label>
              <Input
                type="text"
                value={formData.amount}
                onChange={handleAmountChange}
                placeholder="예: 1,000,000"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.amount
                  ? `${parseKrwInput(formData.amount).toLocaleString()} 원`
                  : ''}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태 *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                납부기한 *
              </label>
              <Input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                required
              />
            </div>

            {formData.status === 'completed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  결제일
                </label>
                <Input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleChange}
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="예: 2024년 3월 수강료"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => window.history.back()}>
              취소
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
