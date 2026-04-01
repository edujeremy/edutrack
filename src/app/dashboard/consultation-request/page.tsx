'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import type { Profile, Student, ConsultationRequest } from '@/lib/types'

export default function ConsultationRequestPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [requests, setRequests] = useState<ConsultationRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [submitMessage, setSubmitMessage] = useState('')

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

        // Get students where parent_id = user.id
        const { data: studentsData } = await supabase
          .from('students')
          .select('*')
          .eq('parent_id', user.id)

        if (studentsData) {
          setStudents(studentsData)
          if (studentsData.length > 0) {
            setSelectedStudentId(studentsData[0].id)
          }
        }

        // Get consultation requests
        const { data: requestsData } = await supabase
          .from('consultation_requests')
          .select('*')
          .eq('parent_id', user.id)
          .order('created_at', { ascending: false })

        if (requestsData) {
          setRequests(requestsData)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim() || !selectedStudentId) {
      setSubmitMessage('필수 항목을 입력해주세요')
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitMessage('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('consultation_requests')
        .insert([
          {
            parent_id: user.id,
            student_id: selectedStudentId,
            subject,
            message: message || null,
            preferred_date: preferredDate || null,
            preferred_time: preferredTime || null,
            status: 'pending',
          },
        ])
        .select()

      if (error) {
        setSubmitMessage('상담 신청에 실패했습니다')
        return
      }

      // Reset form
      setSubject('')
      setMessage('')
      setPreferredDate('')
      setPreferredTime('')
      setSubmitMessage('상담 신청이 완료되었습니다')

      // Reload requests
      const { data: requestsData } = await supabase
        .from('consultation_requests')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false })

      if (requestsData) {
        setRequests(requestsData)
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSubmitMessage(''), 3000)
    } catch (error) {
      console.error('Error submitting request:', error)
      setSubmitMessage('요청 처리 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="상담 신청" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" label="로딩 중..." />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header title="상담 신청" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* New Request Form */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                상담 신청하기
              </h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    학생 선택 *
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">선택해주세요</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상담 주제 *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="예: 수학 성적 개선 방안"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상담 내용
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="자세한 내용을 입력해주세요 (선택사항)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      선호 날짜
                    </label>
                    <input
                      type="date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      선호 시간
                    </label>
                    <input
                      type="time"
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {submitMessage && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      submitMessage.includes('완료') ||
                      submitMessage.includes('성공')
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {submitMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? '신청 중...' : '상담 신청'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Past Requests */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                신청 내역
              </h2>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-center text-gray-600 py-8">
                  상담 신청 내역이 없습니다
                </p>
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => {
                    const student = students.find(
                      (s) => s.id === request.student_id
                    )
                    const statusColor =
                      request.status === 'completed'
                        ? 'bg-green-50 border-l-4 border-green-500'
                        : request.status === 'scheduled'
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : request.status === 'cancelled'
                            ? 'bg-gray-50 border-l-4 border-gray-500'
                            : 'bg-yellow-50 border-l-4 border-yellow-500'

                    const statusLabel =
                      request.status === 'completed'
                        ? '완료'
                        : request.status === 'scheduled'
                          ? '예정됨'
                          : request.status === 'cancelled'
                            ? '취소됨'
                            : '대기중'

                    const createdDate = new Date(request.created_at)
                    const dateStr = createdDate.toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                    })

                    return (
                      <div key={request.id} className={`p-4 rounded-lg ${statusColor}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900">
                                {student?.name} - {request.subject}
                              </p>
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  request.status === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : request.status === 'scheduled'
                                      ? 'bg-blue-100 text-blue-700'
                                      : request.status === 'cancelled'
                                        ? 'bg-gray-100 text-gray-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {statusLabel}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              신청일: {dateStr}
                            </p>
                            {request.message && (
                              <p className="text-sm text-gray-700 mt-2">
                                {request.message}
                              </p>
                            )}
                            {request.preferred_date && (
                              <p className="text-sm text-gray-600 mt-1">
                                선호일시: {request.preferred_date}{' '}
                                {request.preferred_time}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
