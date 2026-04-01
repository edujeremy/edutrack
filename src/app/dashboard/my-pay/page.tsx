'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import type { Profile, Teacher, TeacherPaySettlement } from '@/lib/types'

export default function MyPayPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [settlements, setSettlements] = useState<TeacherPaySettlement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        // Get current user profile
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (!profileData) return
        setProfile(profileData)

        // Get teacher record
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('*')
          .eq('profile_id', user.id)
          .maybeSingle()

        if (!teacherData) {
          setIsLoading(false)
          return
        }
        setTeacher(teacherData)

        // Get pay settlements
        const { data: settlementsData } = await supabase
          .from('teacher_pay_settlements')
          .select('*')
          .eq('teacher_id', teacherData.id)
          .order('period_end', { ascending: false })

        if (settlementsData) {
          setSettlements(settlementsData)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleConfirmReceived = async (settlementId: string) => {
    try {
      setIsUpdating(settlementId)

      await supabase
        .from('teacher_pay_settlements')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', settlementId)

      // Reload settlements
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !teacher) return

      const { data: settlementsData } = await supabase
        .from('teacher_pay_settlements')
        .select('*')
        .eq('teacher_id', teacher.id)
        .order('period_end', { ascending: false })

      if (settlementsData) {
        setSettlements(settlementsData)
      }
    } catch (error) {
      console.error('Error confirming payment:', error)
    } finally {
      setIsUpdating(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="급여 현황" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" label="로딩 중..." />
        </div>
      </div>
    )
  }

  // Calculate summary stats
  const thisMonth = new Date()
  const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1)
  const monthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0)

  const thisMonthSettlement = settlements.find((s) => {
    const periodEnd = new Date(s.period_end)
    return periodEnd >= monthStart && periodEnd <= monthEnd
  })

  const totalEarned = settlements.reduce((sum, s) => {
    if (s.status === 'confirmed' || s.status === 'paid') {
      return sum + s.total_amount
    }
    return sum
  }, 0)

  const pendingAmount = settlements.reduce((sum, s) => {
    if (s.status === 'pending') {
      return sum + s.total_amount
    }
    return sum
  }, 0)

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header title="급여 현황" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-2">
                    이번달 예상 급여
                  </p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {thisMonthSettlement
                      ? `${thisMonthSettlement.total_amount.toLocaleString()}원`
                      : '없음'}
                  </p>
                  {thisMonthSettlement && (
                    <p className="text-xs text-gray-600 mt-2">
                      {thisMonthSettlement.session_count}회차 × {thisMonthSettlement.per_session_rate.toLocaleString()}원
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-2">
                    누적 정산액
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {totalEarned.toLocaleString()}원
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    확정/지급 완료
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-2">
                    대기 중인 정산
                  </p>
                  <p className="text-3xl font-bold text-orange-600">
                    {pendingAmount.toLocaleString()}원
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    {settlements.filter((s) => s.status === 'pending').length}건
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settlements List */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                정산 현황
              </h2>
            </CardHeader>
            <CardContent>
              {settlements.length === 0 ? (
                <p className="text-center text-gray-600 py-8">
                  정산 내역이 없습니다
                </p>
              ) : (
                <div className="space-y-3">
                  {settlements.map((settlement) => {
                    const periodStart = new Date(settlement.period_start)
                    const periodEnd = new Date(settlement.period_end)
                    const periodLabel = `${periodStart.getMonth() + 1}월 ${periodStart.getDate()}일 ~ ${periodEnd.getMonth() + 1}월 ${periodEnd.getDate()}일`

                    const statusColor =
                      settlement.status === 'paid'
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : settlement.status === 'confirmed'
                          ? 'bg-green-50 border-l-4 border-green-500'
                          : 'bg-yellow-50 border-l-4 border-yellow-500'

                    const statusLabel =
                      settlement.status === 'paid'
                        ? '지급완료'
                        : settlement.status === 'confirmed'
                          ? '확정'
                          : '대기중'

                    return (
                      <div
                        key={settlement.id}
                        className={`p-4 rounded-lg flex items-center justify-between ${statusColor}`}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {periodLabel}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {settlement.session_count}회차 × {settlement.per_session_rate.toLocaleString()}원/회
                          </p>
                          <p className="text-lg font-semibold text-gray-900 mt-2">
                            {settlement.total_amount.toLocaleString()}원
                          </p>
                        </div>

                        <div className="ml-4 flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              settlement.status === 'paid'
                                ? 'bg-blue-100 text-blue-700'
                                : settlement.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {statusLabel}
                          </span>

                          {settlement.status === 'paid' && (
                            <Button
                              onClick={() =>
                                handleConfirmReceived(settlement.id)
                              }
                              disabled={isUpdating === settlement.id}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                            >
                              {isUpdating === settlement.id
                                ? '처리중...'
                                : '받았습니다'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="bg-blue-50 border-l-4 border-blue-500">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-700">
                <strong>정산 안내:</strong> 정산 금액은 수업 진행 후 승인된 코멘트를 기준으로 계산됩니다.
                "받았습니다" 버튼을 클릭하여 수령 확인을 해주세요.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
