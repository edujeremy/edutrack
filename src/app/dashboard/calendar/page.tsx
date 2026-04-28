'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Student, Package, Lesson, Comment } from '@/lib/types'
import { convertFromPST, type SupportedTimezone, tzShortLabel, trimTime } from '@/lib/timezone'

interface LessonWithComment extends Lesson {
  comment?: Comment | null
  student_name?: string
  package_name?: string
  teacher_name?: string
  parent_post_absence_action?: 'requested_makeup' | 'skipped' | null
  makeup_proposed_date?: string | null
  makeup_proposed_start?: string | null
  makeup_proposed_end?: string | null
  makeup_parent_approved?: boolean
}

export default function CalendarPage() {
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [students, setStudents] = useState<Student[]>([])
  const [lessons, setLessons] = useState<LessonWithComment[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayLessons, setDayLessons] = useState<LessonWithComment[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLessonComment, setSelectedLessonComment] = useState<LessonWithComment | null>(null)
  const [absenceProcessing, setAbsenceProcessing] = useState<string | null>(null)
  const [absenceRequesting, setAbsenceRequesting] = useState<string | null>(null)
  const [commentModalLesson, setCommentModalLesson] = useState<LessonWithComment | null>(null)
  const [tuitionPopupPkg, setTuitionPopupPkg] = useState<Package | null>(null)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [confirmAbsence, setConfirmAbsence] = useState<string | null>(null)
  const [userTimezone, setUserTimezone] = useState<SupportedTimezone>('America/Los_Angeles')

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        if (!profileData) return
        if (profileData.timezone) {
          setUserTimezone(profileData.timezone as SupportedTimezone)
        }

        const { data: studentsData } = await supabase
          .from('students')
          .select('*')
          .eq('parent_id', user.id)

        if (!studentsData || studentsData.length === 0) {
          setIsLoading(false)
          return
        }
        setStudents(studentsData)

        const { data: pkgs } = await supabase
          .from('packages')
          .select('*')
          .in('student_id', studentsData.map((s: Student) => s.id))

        if (!pkgs || pkgs.length === 0) {
          setIsLoading(false)
          return
        }
        setPackages(pkgs)

        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('*')
          .in('package_id', pkgs.map((p: Package) => p.id))

        if (lessonsData) {
          const { data: commentsData } = await supabase
            .from('comments')
            .select('*')
            .in('lesson_id', lessonsData.map((l: Lesson) => l.id))

          const { data: teachersData } = await supabase
            .from('teachers')
            .select('id, profile_id')

          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name')

          const profileMap = new Map(
            (profilesData || []).map((p: any) => [p.id, p.name])
          )

          const enrichedLessons = lessonsData.map((lesson: Lesson) => {
            const pkg = pkgs.find((p: Package) => p.id === lesson.package_id)
            const student = studentsData.find((s: Student) => s.id === pkg?.student_id)
            const teacher = (teachersData || []).find((t: any) => t.id === pkg?.teacher_id)
            const comment = (commentsData || []).find((c: Comment) => c.lesson_id === lesson.id)

            return {
              ...lesson,
              comment,
              student_name: student?.name || 'Unknown',
              package_name: pkg?.name || 'Unknown',
              teacher_name: teacher ? profileMap.get(teacher.profile_id) : 'Unknown',
            }
          })

          setLessons(enrichedLessons)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const getLessonsForDate = (dateStr: string) => lessons.filter((l) => l.lesson_date === dateStr)
  const hasApprovedComment = (dateStr: string) => getLessonsForDate(dateStr).some(l => l.comment?.status === 'approved')

  const handleCommentBadgeClick = (e: React.MouseEvent, dateStr: string) => {
    e.stopPropagation()
    const lessonsWithComment = getLessonsForDate(dateStr).filter(l => l.comment?.status === 'approved')
    if (lessonsWithComment.length > 0) {
      const lesson = lessonsWithComment[0]
      setCommentModalLesson(lesson)
      // Mark as read by parent
      if (lesson.comment?.id && !(lesson.comment as any).parent_read_at) {
        supabase.from('comments').update({ parent_read_at: new Date().toISOString() }).eq('id', lesson.comment.id).then(({ error }) => {
          if (error) console.error('parent_read_at update error:', error)
        })
      }
    }
  }

  const isAbsentLike = (a: string) => a === 'absent' || a === 'absent_notified' || a === 'no_show' || a === 'skipped'
  const isMakeupLike = (a: string) => a === 'makeup_requested' || a === 'makeup_proposed' || a === 'makeup_scheduled' || a === 'makeup_done'

  // 수업 시간 표시 — PST 기준 DB값을 사용자 timezone으로 변환
  const formatLessonTime = (lesson: { lesson_date: string; start_time: string; end_time: string }) => {
    if (!lesson.start_time || !lesson.end_time) return ''
    if (userTimezone === 'America/Los_Angeles') {
      return `${trimTime(lesson.start_time)}~${trimTime(lesson.end_time)} (PT)`
    }
    try {
      const a = convertFromPST(lesson.lesson_date, lesson.start_time, userTimezone)
      const b = convertFromPST(lesson.lesson_date, lesson.end_time, userTimezone)
      return `${a.time}~${b.time} (${tzShortLabel(userTimezone)})`
    } catch {
      return `${trimTime(lesson.start_time)}~${trimTime(lesson.end_time)} (PT)`
    }
  }

  const getDateStyle = (dateStr: string): string => {
    const dayLessons = getLessonsForDate(dateStr)
    if (dayLessons.length === 0) return ''
    if (dayLessons.some((l) => l.comment?.status === 'approved')) return 'bg-purple-100 border-l-4 border-purple-500'
    if (dayLessons.some((l) => l.attendance === 'attended')) return 'bg-green-100 border-l-4 border-green-500'
    if (dayLessons.some((l) => isMakeupLike(l.attendance as any))) return 'bg-amber-100 border-l-4 border-amber-500'
    if (dayLessons.some((l) => isAbsentLike(l.attendance as any))) return 'bg-red-100 border-l-4 border-red-500'
    return 'bg-blue-100 border-l-4 border-blue-500'
  }

  const getLessonDots = (dateStr: string) => {
    const dayLessons = getLessonsForDate(dateStr)
    return dayLessons.map((l) => {
      if (l.comment?.status === 'approved') return 'bg-purple-500'
      if (l.attendance === 'attended') return 'bg-green-500'
      if (isMakeupLike(l.attendance as any)) return 'bg-amber-500'
      if (isAbsentLike(l.attendance as any)) return 'bg-red-500'
      return 'bg-blue-500'
    })
  }

  const handleSelectDate = (dateStr: string) => {
    const lessonsForDate = getLessonsForDate(dateStr)
    if (lessonsForDate.length > 0) {
      setSelectedDate(dateStr)
      setDayLessons(lessonsForDate)
      setIsModalOpen(true)
      setSelectedLessonComment(null)
    }
  }

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleAbsenceClick = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId)
    if (!lesson) return

    // 수업 시작 1시간 전 마감 체크
    const lessonDateTime = new Date(`${lesson.lesson_date}T${lesson.start_time}`)
    const now = new Date()
    const oneHourBefore = new Date(lessonDateTime.getTime() - 60 * 60 * 1000)

    if (now >= oneHourBefore) {
      showToast('수업 시작 1시간 전부터는 결석 신청이 불가합니다.', 'error')
      return
    }

    setConfirmAbsence(lessonId)
  }

  const handleAbsenceRequest = async (lessonId: string) => {
    setConfirmAbsence(null)
    setAbsenceRequesting(lessonId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1) 결석 요청 테이블에 기록
      const { error: reqError } = await supabase
        .from('absence_requests')
        .insert({
          lesson_id: lessonId,
          parent_id: user.id,
          reason: '학부모 결석 신청',
          status: 'approved',
        })

      if (reqError) {
        console.error('Absence request error:', reqError)
        showToast('결석 신청 중 오류가 발생했습니다.', 'error')
        return
      }

      // 2) 실제 수업 출석 상태를 absent_notified로 변경 + 미청구 처리
      const { error: lessonError } = await supabase
        .from('lessons')
        .update({
          attendance: 'absent_notified',
          absence_reason: '학부모 사전 결석 신청',
          is_billable: false,
          is_teacher_payable: false,
        })
        .eq('id', lessonId)

      if (lessonError) {
        console.error('Lesson update error:', lessonError)
      }

      // 3) 로컬 상태 업데이트
      const updatedLesson = {
        attendance: 'absent_notified' as any,
        absence_reason: '학부모 사전 결석 신청',
        is_billable: false,
        is_teacher_payable: false,
      }
      setLessons(prev => prev.map(l =>
        l.id === lessonId ? { ...l, ...updatedLesson } : l
      ))
      setDayLessons(prev => prev.map(l =>
        l.id === lessonId ? { ...l, ...updatedLesson } : l
      ))

      showToast('결석 신청이 완료되었습니다.')
    } catch (err) {
      console.error('Absence request error:', err)
      showToast('결석 신청 중 오류가 발생했습니다.', 'error')
    } finally {
      setAbsenceRequesting(null)
    }
  }

  // 학부모 후속 액션: 보강 요청 — attendance enum 변경 없이 컬럼만 update
  const handleRequestMakeup = async (lessonId: string) => {
    const { error } = await supabase
      .from('lessons')
      .update({ parent_post_absence_action: 'requested_makeup' })
      .eq('id', lessonId)
    if (error) {
      showToast('보강 요청 실패: ' + error.message, 'error')
      return
    }
    setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, parent_post_absence_action: 'requested_makeup' } : l))
    setDayLessons(prev => prev.map(l => l.id === lessonId ? { ...l, parent_post_absence_action: 'requested_makeup' } : l))
    showToast('보강 요청 완료. 강사가 슬롯을 제안하면 알림이 옵니다.')
  }

  // 학부모 후속 액션: 스킵 (보강 안 함)
  const handleSkipLesson = async (lessonId: string) => {
    const { error } = await supabase
      .from('lessons')
      .update({
        parent_post_absence_action: 'skipped',
        is_billable: false,
        is_teacher_payable: false,
      })
      .eq('id', lessonId)
    if (error) {
      showToast('스킵 처리 실패: ' + error.message, 'error')
      return
    }
    setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, parent_post_absence_action: 'skipped', is_billable: false, is_teacher_payable: false } : l))
    setDayLessons(prev => prev.map(l => l.id === lessonId ? { ...l, parent_post_absence_action: 'skipped', is_billable: false, is_teacher_payable: false } : l))
    showToast('스킵 처리 완료. 회차·청구 모두 면제됩니다.')
  }

  // 학부모 후속 액션: 강사 보강 제안 승인
  const handleApproveMakeupProposal = async (lessonId: string) => {
    const { error } = await supabase
      .from('lessons')
      .update({
        makeup_parent_approved: true,
        makeup_parent_approved_at: new Date().toISOString(),
      })
      .eq('id', lessonId)
    if (error) {
      showToast('보강 승인 실패: ' + error.message, 'error')
      return
    }
    setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, makeup_parent_approved: true } : l))
    setDayLessons(prev => prev.map(l => l.id === lessonId ? { ...l, makeup_parent_approved: true } : l))
    showToast('보강 일정이 확정되었습니다.')
  }

  const handleAbsenceBilling = async (lessonId: string, billable: boolean) => {
    setAbsenceProcessing(lessonId)
    try {
      const { error } = await supabase
        .from('lessons')
        .update({
          is_billable: billable,
          is_teacher_payable: billable,
        })
        .eq('id', lessonId)

      if (!error) {
        setLessons(prev => prev.map(l =>
          l.id === lessonId ? { ...l, is_billable: billable, is_teacher_payable: billable } : l
        ))
        setDayLessons(prev => prev.map(l =>
          l.id === lessonId ? { ...l, is_billable: billable, is_teacher_payable: billable } : l
        ))
      }
    } catch (err) {
      console.error('Billing update error:', err)
    } finally {
      setAbsenceProcessing(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="수업 캘린더" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" label="로딩 중..." />
        </div>
      </div>
    )
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDayOfMonth = getFirstDayOfMonth(currentDate)
  const monthName = currentDate.toLocaleString('ko-KR', { year: 'numeric', month: 'long' })

  const calendarDays: (string | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    calendarDays.push(dateStr)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">수업 캘린더</h1>
          <p className="text-xs text-gray-500 mt-0.5">시간대: {tzShortLabel(userTimezone)} · 변경은 알림 설정에서</p>
        </div>
        <Link
          href="/dashboard/consultation-request"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
          상담 요청
        </Link>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-xl font-semibold text-gray-900">{monthName}</h2>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                  <div key={day} className={`text-center font-semibold text-xs md:text-sm py-2 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'}`}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {calendarDays.map((dateStr, idx) => {
                  const dateLessons = dateStr ? getLessonsForDate(dateStr) : []
                  const hasLessons = dateLessons.length > 0
                  const isToday = dateStr === today
                  const dayNum = dateStr ? new Date(dateStr).getDate() : ''
                  const dayOfWeek = idx % 7
                  const hasComment = dateStr ? hasApprovedComment(dateStr) : false

                  return (
                    <button
                      key={idx}
                      onClick={() => dateStr && handleSelectDate(dateStr)}
                      className={`relative p-1 md:p-2 rounded-lg text-xs md:text-sm font-medium transition-all min-h-[56px] md:min-h-[64px] flex flex-col items-center ${
                        dateStr
                          ? hasLessons
                            ? `${getDateStyle(dateStr)} cursor-pointer hover:shadow-md active:scale-95`
                            : `cursor-default ${dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'text-gray-500'}`
                          : 'cursor-default'
                      } ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                      disabled={!hasLessons}
                    >
                      <span className={`${isToday ? 'font-bold text-indigo-600' : ''} leading-tight`}>{dayNum}</span>
                      {/* Session numbers */}
                      {dateLessons.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                          {dateLessons.map((l) => (
                            <span key={l.id} className={`text-[9px] md:text-[10px] font-bold leading-none px-1 py-0.5 rounded ${
                              l.attendance === 'attended' ? 'text-green-700' :
                              l.attendance === 'absent' ? 'text-red-600' :
                              'text-blue-600'
                            }`}>
                              {l.attendance === 'absent' && (l as any).absence_type === 'excused' ? '결석' : `${l.session_number}회`}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Blinking comment badge */}
                      {hasComment && (
                        <div
                          onClick={(e) => dateStr && handleCommentBadgeClick(e, dateStr)}
                          className="absolute -top-1 -right-1 cursor-pointer"
                        >
                          <span className="relative flex h-4 w-4 md:h-5 md:w-5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 md:h-5 md:w-5 bg-purple-500 items-center justify-center">
                              <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                            </span>
                          </span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap gap-4 text-xs md:text-sm">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500" /><span className="text-gray-600">코멘트</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-gray-600">출석</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-gray-600">결석</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-gray-600">예정</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Package Progress */}
          {packages.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">수강 진행 현황</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {packages.map((pkg) => {
                    const student = students.find(s => s.id === pkg.student_id)
                    const pkgLessons = lessons.filter(l => l.package_id === pkg.id)
                    const attended = pkgLessons.filter(l => l.attendance === 'attended').length
                    const absentBillable = pkgLessons.filter(l => l.attendance === 'absent' && l.is_billable).length
                    const absentPass = pkgLessons.filter(l => l.attendance === 'absent' && !l.is_billable).length
                    // 소모된 회차 = 출석 + 결석(청구). 미청구 결석은 회차 소모 안됨
                    const consumed = attended + absentBillable
                    const billingCycle = (pkg as any).billing_cycle || 0
                    // 주기 기반: billingCycle > 0이면 cycle 단위로 표시, 0이면 전체 기준
                    const cycleTotal = billingCycle > 0 ? billingCycle : pkg.total_sessions
                    const currentCycleNum = billingCycle > 0 ? Math.floor(consumed / billingCycle) + 1 : 1
                    const cycleConsumed = billingCycle > 0 ? consumed % billingCycle : consumed
                    const remaining = Math.max(pkg.total_sessions - consumed, 0)
                    const pct = Math.round((consumed / pkg.total_sessions) * 100)
                    const isComplete = consumed >= pkg.total_sessions
                    // 주기 완료: 현재 소모가 cycle의 배수에 도달 (납부 시점)
                    const isCycleDue = billingCycle > 0 && consumed > 0 && consumed % billingCycle === 0
                    const showPayButton = isComplete || isCycleDue
                    return (
                      <div
                        key={pkg.id}
                        className={`border rounded-lg p-4 transition-all ${
                          isComplete ? 'border-green-300 bg-green-50' : isCycleDue ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">{student?.name}</p>
                            <p className="text-xs text-gray-500">
                              {pkg.name}
                              {billingCycle > 0 && <span className="ml-1 text-blue-600">({billingCycle}회 단위)</span>}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`text-3xl font-bold ${isComplete ? 'text-green-600' : 'text-indigo-600'}`}>
                              {consumed}<span className="text-lg text-gray-400">/{pkg.total_sessions}</span>
                            </span>
                            {billingCycle > 0 && !isComplete && (
                              <p className="text-xs text-gray-500">다음 납부: {billingCycle - cycleConsumed}회 후</p>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                          <div
                            className={`h-3 rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex gap-3 text-xs text-gray-500">
                            <span>출석 {attended}회</span>
                            {absentBillable > 0 && <span className="text-orange-500">결석(청구) {absentBillable}회</span>}
                            {absentPass > 0 && <span className="text-blue-500">패스 {absentPass}회</span>}
                            <span className="font-medium text-gray-700">잔여 {remaining}회</span>
                          </div>
                          {showPayButton && (
                            <button
                              onClick={() => setTuitionPopupPkg(pkg)}
                              className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg transition-colors animate-pulse ${
                                isComplete ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'
                              }`}
                            >
                              {isComplete ? '수강 완료 — 수강료 납부' : `${billingCycle}회 완료 — 수강료 납부`}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Day Detail Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center" onClick={() => { setIsModalOpen(false); setSelectedLessonComment(null) }}>
          <div className="bg-white w-full md:max-w-lg md:rounded-xl rounded-t-xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-indigo-50">
              <h3 className="text-lg font-bold text-indigo-900">
                {selectedDate && new Date(selectedDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setSelectedLessonComment(null) }} className="text-gray-500 hover:text-gray-700 p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto max-h-[70vh] p-5 space-y-4">
              {dayLessons.map((lesson) => (
                <div key={lesson.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Lesson Header */}
                  <div className={`p-4 ${
                    lesson.attendance === 'absent' ? 'bg-red-50' : lesson.attendance === 'attended' ? 'bg-green-50' : 'bg-blue-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{lesson.student_name}</p>
                        <p className="text-sm text-gray-600">{lesson.package_name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {lesson.attendance === 'absent' && (lesson as any).absence_type === 'excused'
                            ? '결석인정'
                            : `${lesson.session_number}회차`
                          } &middot; {lesson.teacher_name} &middot; {formatLessonTime(lesson)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        lesson.attendance === 'attended' ? 'bg-green-200 text-green-800' :
                        lesson.attendance === 'absent' && (lesson as any).absence_type === 'noshow' ? 'bg-orange-200 text-orange-800' :
                        lesson.attendance === 'absent' ? 'bg-red-200 text-red-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {lesson.attendance === 'attended' ? '출석'
                          : lesson.attendance === 'absent' && (lesson as any).absence_type === 'noshow' ? '노쇼'
                          : lesson.attendance === 'absent' && (lesson as any).absence_type === 'excused' ? '결석'
                          : lesson.attendance === 'absent' && (lesson as any).absence_type === 'makeup' ? '보강예정'
                          : lesson.attendance === 'absent' ? '결석'
                          : '예정'}
                      </span>
                    </div>

                    {/* Absent: Status display for parent + 보강/스킵 액션 */}
                    {isAbsentLike(lesson.attendance as any) && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-red-200 space-y-3">
                        <p className="text-sm text-gray-600">
                          결석 처리 상태: {
                            (lesson.attendance as string) === 'no_show' ? <span className="font-medium text-orange-700">노쇼 (원장 검토)</span> :
                            lesson.is_billable ? <span className="font-medium text-orange-600">수강료 청구</span> :
                            <span className="font-medium text-gray-600">패스 (미청구)</span>
                          }
                        </p>

                        {/* 학부모 후속 액션 — 아직 결정 안 한 경우만 노출 */}
                        {!lesson.parent_post_absence_action && (lesson.attendance as string) !== 'no_show' && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleRequestMakeup(lesson.id)}
                              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg"
                            >
                              보강 요청
                            </button>
                            <button
                              onClick={() => handleSkipLesson(lesson.id)}
                              className="px-3 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm font-medium rounded-lg"
                            >
                              스킵 (보강 안 함)
                            </button>
                          </div>
                        )}
                        {lesson.parent_post_absence_action === 'requested_makeup' && (
                          <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded">
                            보강 요청됨 — 강사 슬롯 제안 대기 중
                          </div>
                        )}
                        {lesson.parent_post_absence_action === 'skipped' && (
                          <div className="text-xs text-gray-500">스킵 처리됨</div>
                        )}
                      </div>
                    )}

                    {/* 강사 보강 슬롯 제안 — 학부모 승인 대기 (컬럼 기반) */}
                    {lesson.makeup_proposed_date && !lesson.makeup_parent_approved && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-amber-300 space-y-2">
                        <p className="text-sm font-bold text-amber-800">강사 보강 제안</p>
                        <p className="text-sm text-gray-700">
                          {lesson.makeup_proposed_date} {trimTime(lesson.makeup_proposed_start)}~{trimTime(lesson.makeup_proposed_end)} ({tzShortLabel(userTimezone)})
                        </p>
                        <button
                          onClick={() => handleApproveMakeupProposal(lesson.id)}
                          className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg"
                        >
                          이 일정으로 승인
                        </button>
                      </div>
                    )}

                    {/* 보강 확정 — makeup_parent_approved=true 컬럼 기반 */}
                    {lesson.makeup_parent_approved && lesson.makeup_proposed_date && (
                      <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm text-amber-800">
                          보강 일정 확정: {lesson.makeup_proposed_date} {trimTime(lesson.makeup_proposed_start)}~{trimTime(lesson.makeup_proposed_end)} ({tzShortLabel(userTimezone)})
                        </p>
                      </div>
                    )}

                    {/* Scheduled: Absence Request */}
                    {lesson.attendance === 'scheduled' && (() => {
                      const lessonDT = new Date(`${lesson.lesson_date}T${lesson.start_time}`)
                      const oneHourBefore = new Date(lessonDT.getTime() - 60 * 60 * 1000)
                      const isDeadlinePassed = new Date() >= oneHourBefore
                      return (
                        <div className="mt-3">
                          <button
                            onClick={() => handleAbsenceClick(lesson.id)}
                            disabled={absenceRequesting === lesson.id || isDeadlinePassed}
                            className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isDeadlinePassed
                                ? 'bg-gray-100 border border-gray-300 text-gray-400 cursor-not-allowed'
                                : 'bg-white border border-red-300 text-red-600 hover:bg-red-50'
                            }`}
                          >
                            {absenceRequesting === lesson.id
                              ? '처리 중...'
                              : isDeadlinePassed
                                ? '결석 신청 마감 (수업 1시간 전)'
                                : '결석 신청'}
                          </button>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Comment Section */}
                  {lesson.comment?.status === 'approved' && (
                    <div className="border-t border-gray-200">
                      <button
                        onClick={() => {
                          const isOpening = selectedLessonComment?.id !== lesson.id;
                          setSelectedLessonComment(isOpening ? lesson : null);
                          // Mark as read by parent when opening
                          if (isOpening && lesson.comment?.id && !(lesson.comment as any).parent_read_at) {
                            supabase.from('comments').update({ parent_read_at: new Date().toISOString() }).eq('id', lesson.comment.id).then(({ error }) => {
                              if (error) console.error('parent_read_at update error:', error)
                            });
                          }
                        }}
                        className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-purple-700 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                          수업 코멘트 보기
                        </span>
                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${selectedLessonComment?.id === lesson.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>

                      {selectedLessonComment?.id === lesson.id && (
                        <div className="px-4 pb-4 space-y-3">
                          <div className="bg-purple-50 rounded-lg p-3 space-y-3">
                            <div>
                              <p className="text-xs font-bold text-purple-600 mb-1">진도</p>
                              <p className="text-sm text-gray-800">{lesson.comment.progress}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-purple-600 mb-1">숙제 평가</p>
                              <p className="text-sm text-gray-800">{lesson.comment.homework_evaluation}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-purple-600 mb-1">잘한 점</p>
                              <p className="text-sm text-gray-800">{lesson.comment.strengths}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-purple-600 mb-1">개선할 점</p>
                              <p className="text-sm text-gray-800">{lesson.comment.improvements}</p>
                            </div>
                            <div className="pt-2 border-t border-purple-200">
                              <p className="text-xs font-bold text-purple-600 mb-1">숙제</p>
                              <p className="text-sm font-medium text-gray-900">{lesson.comment.homework}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal (from blinking badge click) */}
      {commentModalLesson && commentModalLesson.comment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center" onClick={() => setCommentModalLesson(null)}>
          <div className="bg-white w-full md:max-w-lg md:rounded-xl rounded-t-xl max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-purple-50">
              <div>
                <h3 className="text-lg font-bold text-purple-900">수업 코멘트</h3>
                <p className="text-sm text-purple-600">{commentModalLesson.student_name} &middot; {commentModalLesson.session_number}회차 &middot; {commentModalLesson.teacher_name}</p>
              </div>
              <button onClick={() => setCommentModalLesson(null)} className="text-gray-500 hover:text-gray-700 p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold text-purple-600 mb-1">진도</p>
                  <p className="text-sm text-gray-800">{commentModalLesson.comment.progress}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-purple-600 mb-1">숙제 평가</p>
                  <p className="text-sm text-gray-800">{commentModalLesson.comment.homework_evaluation}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-purple-600 mb-1">잘한 점</p>
                  <p className="text-sm text-gray-800">{commentModalLesson.comment.strengths}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-purple-600 mb-1">개선할 점</p>
                  <p className="text-sm text-gray-800">{commentModalLesson.comment.improvements}</p>
                </div>
                <div className="pt-2 border-t border-purple-200">
                  <p className="text-xs font-bold text-purple-600 mb-1">숙제</p>
                  <p className="text-sm font-medium text-gray-900">{commentModalLesson.comment.homework}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tuition Payment Popup */}
      {tuitionPopupPkg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center" onClick={() => setTuitionPopupPkg(null)}>
          <div className="bg-white w-full md:max-w-md md:rounded-xl rounded-t-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-green-600 px-6 py-5 text-white text-center">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <h3 className="text-xl font-bold">수강 완료!</h3>
              <p className="text-green-100 text-sm mt-1">{students.find(s => s.id === tuitionPopupPkg.student_id)?.name} — {tuitionPopupPkg.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">총 수업</span>
                  <span className="font-bold text-gray-900">{tuitionPopupPkg.total_sessions}회</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">수강료</span>
                  <span className="text-2xl font-bold text-green-600">${(tuitionPopupPkg.tuition_amount || 0).toLocaleString()}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 text-center">
                모든 수업이 완료되었습니다. 수강료 납부를 진행해주세요.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTuitionPopupPkg(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  나중에
                </button>
                <Link
                  href="/dashboard/consultation-request"
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium text-center hover:bg-green-700 transition-colors"
                >
                  납부 문의
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Absence Confirm Dialog */}
      {confirmAbsence && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center" onClick={() => setConfirmAbsence(null)}>
          <div className="bg-white rounded-xl p-6 mx-4 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">결석 신청</h3>
              <p className="text-sm text-gray-600 mt-1">이 수업을 결석 처리하시겠습니까?<br />결석 신청 시 출석이 &lsquo;결석&rsquo;으로 변경됩니다.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAbsence(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleAbsenceRequest(confirmAbsence)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                결석 신청
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Message */}
      {toastMessage && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
          toastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toastMessage.text}
        </div>
      )}
    </div>
  )
}
