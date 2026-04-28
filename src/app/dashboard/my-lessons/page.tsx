'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Profile, Teacher, Package, Lesson, Comment } from '@/lib/types'
import { convertFromPST, type SupportedTimezone, tzShortLabel, trimTime } from '@/lib/timezone'

interface LessonWithMeta extends Lesson {
  student_name?: string
  comment_status?: string
  parent_post_absence_action?: 'requested_makeup' | 'skipped' | null
  makeup_proposed_date?: string | null
  makeup_proposed_start?: string | null
  makeup_proposed_end?: string | null
  makeup_parent_approved?: boolean
}

const ATTENDANCE_LABEL: Record<string, { label: string; color: string }> = {
  scheduled: { label: '예정', color: 'bg-blue-100 text-blue-700' },
  attended: { label: '출석', color: 'bg-green-100 text-green-700' },
  absent: { label: '결석', color: 'bg-red-100 text-red-700' },
  absent_notified: { label: '통보 결석', color: 'bg-red-100 text-red-700' },
  no_show: { label: '노쇼', color: 'bg-orange-100 text-orange-800' },
  cancelled: { label: '취소', color: 'bg-gray-100 text-gray-600' },
  makeup_requested: { label: '보강 요청 (학부모)', color: 'bg-amber-100 text-amber-800' },
  makeup_proposed: { label: '보강 제안 (대기)', color: 'bg-amber-100 text-amber-800' },
  makeup_scheduled: { label: '보강 확정', color: 'bg-amber-200 text-amber-900' },
  makeup_done: { label: '보강 완료', color: 'bg-green-100 text-green-700' },
  skipped: { label: '스킵', color: 'bg-gray-100 text-gray-600' },
}

export default function MyLessonsPage() {
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [allLessons, setAllLessons] = useState<LessonWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [userTimezone, setUserTimezone] = useState<SupportedTimezone>('America/Los_Angeles')

  // 보강 슬롯 제안 모달
  const [makeupLesson, setMakeupLesson] = useState<LessonWithMeta | null>(null)
  const [makeupDate, setMakeupDate] = useState('')
  const [makeupStart, setMakeupStart] = useState('16:00')
  const [makeupEnd, setMakeupEnd] = useState('18:00')

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
        if (!profileData) return
        setProfile(profileData)
        if (profileData.timezone) setUserTimezone(profileData.timezone as SupportedTimezone)

        const { data: teacherData } = await supabase.from('teachers').select('*').eq('profile_id', user.id).maybeSingle()
        if (!teacherData) {
          setIsLoading(false)
          return
        }
        setTeacher(teacherData)

        const { data: packages } = await supabase.from('packages').select('*').eq('teacher_id', teacherData.id)
        if (!packages || packages.length === 0) {
          setIsLoading(false)
          return
        }

        const { data: lessons } = await supabase
          .from('lessons')
          .select('*, parent_post_absence_action, makeup_proposed_date, makeup_proposed_start, makeup_proposed_end, makeup_parent_approved')
          .in('package_id', packages.map((p: Package) => p.id))

        if (lessons) {
          const { data: studentsData } = await supabase.from('students').select('id, name')
          const studentMap = new Map((studentsData || []).map((s: any) => [s.id, s.name]))

          const { data: commentsData } = await supabase
            .from('comments')
            .select('lesson_id, status')
            .in('lesson_id', lessons.map((l: Lesson) => l.id))
          const commentMap = new Map((commentsData || []).map((c: any) => [c.lesson_id, c.status]))

          const enriched: LessonWithMeta[] = lessons.map((lesson: any) => {
            const pkg = packages.find((p: Package) => p.id === lesson.package_id)
            return {
              ...lesson,
              student_name: pkg ? studentMap.get(pkg.student_id) : 'Unknown',
              comment_status: commentMap.get(lesson.id) || 'none',
            }
          })
          setAllLessons(enriched)
        }
      } catch (error) {
        console.error('my-lessons load error', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const getLessonsForDate = (dateStr: string) => allLessons.filter((l) => l.lesson_date === dateStr)

  // 날짜 셀 색상 — 코멘트/출석 상태 우선순위 반영
  const getDateColor = (dateStr: string | null) => {
    if (!dateStr) return ''
    const lessons = getLessonsForDate(dateStr)
    if (lessons.length === 0) return ''
    if (lessons.some((l) => l.attendance === 'no_show')) return 'bg-orange-100 border-l-4 border-orange-500'
    if (lessons.some((l) => l.attendance === 'makeup_requested' || l.attendance === 'makeup_proposed')) return 'bg-amber-100 border-l-4 border-amber-500'
    if (lessons.some((l) => l.attendance === 'absent_notified' || l.attendance === 'absent' || l.attendance === 'skipped')) return 'bg-red-100 border-l-4 border-red-500'
    if (lessons.some((l) => l.comment_status === 'approved')) return 'bg-green-100 border-l-4 border-green-500'
    if (lessons.some((l) => l.comment_status === 'submitted')) return 'bg-blue-100 border-l-4 border-blue-500'
    if (lessons.some((l) => l.attendance === 'attended')) return 'bg-green-50 border-l-4 border-green-300'
    return 'bg-gray-50'
  }

  const formatLessonTime = (lesson: { lesson_date: string; start_time: string; end_time: string }) => {
    if (userTimezone === 'America/Los_Angeles') return `${trimTime(lesson.start_time)}~${trimTime(lesson.end_time)} (PT)`
    try {
      const a = convertFromPST(lesson.lesson_date, lesson.start_time, userTimezone)
      const b = convertFromPST(lesson.lesson_date, lesson.end_time, userTimezone)
      return `${a.time}~${b.time} (${tzShortLabel(userTimezone)})`
    } catch {
      return `${trimTime(lesson.start_time)}~${trimTime(lesson.end_time)} (PT)`
    }
  }

  // 보강 슬롯 제안 저장 — attendance enum 변경 없이 makeup_* 컬럼만
  const handleProposeMakeup = async () => {
    if (!makeupLesson || !userId) return
    if (!makeupDate || !makeupStart || !makeupEnd) {
      showToast('날짜와 시간을 모두 입력해주세요.', 'error')
      return
    }
    const { error } = await supabase
      .from('lessons')
      .update({
        makeup_proposed_date: makeupDate,
        makeup_proposed_start: makeupStart + ':00',
        makeup_proposed_end: makeupEnd + ':00',
        makeup_proposed_at: new Date().toISOString(),
        makeup_proposed_by: userId,
      })
      .eq('id', makeupLesson.id)
    if (error) {
      showToast('제안 실패: ' + error.message, 'error')
      return
    }
    setAllLessons(prev => prev.map(l => l.id === makeupLesson.id ? {
      ...l,
      makeup_proposed_date: makeupDate,
      makeup_proposed_start: makeupStart + ':00',
      makeup_proposed_end: makeupEnd + ':00',
    } : l))
    setMakeupLesson(null)
    showToast('보강 슬롯 제안 완료. 학부모 승인 대기 중.')
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="내 수업일정" />
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

  const dayLessons = selectedDate ? getLessonsForDate(selectedDate) : []

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header title="내 수업일정" />

      <div className="flex-1 overflow-auto p-6">
        <div className="text-xs text-gray-500 mb-2">시간대: {tzShortLabel(userTimezone)} (관리자 입력 PST 기준 자동 변환)</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-2 hover:bg-gray-100 rounded-lg">‹</button>
                  <h2 className="text-xl font-semibold text-gray-900">{monthName}</h2>
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-2 hover:bg-gray-100 rounded-lg">›</button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                    <div key={day} className="text-center font-semibold text-gray-600 py-2">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((dateStr, idx) => (
                    <button
                      key={idx}
                      onClick={() => dateStr && setSelectedDate(dateStr)}
                      className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                        dateStr ? `${getDateColor(dateStr)} hover:shadow-md cursor-pointer` : 'text-gray-300 cursor-default'
                      } ${selectedDate === dateStr ? 'ring-2 ring-indigo-500' : ''}`}
                    >
                      {dateStr ? new Date(dateStr).getDate() : ''}
                    </button>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 border-l-2 border-green-500"></div>승인됨/출석</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-100 border-l-2 border-blue-500"></div>코멘트 제출</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-100 border-l-2 border-red-500"></div>결석/스킵</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-100 border-l-2 border-orange-500"></div>노쇼</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-100 border-l-2 border-amber-500"></div>보강 진행중</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 선택 날짜 상세 */}
          <div className="lg:col-span-1">
            {dayLessons.length > 0 ? (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">
                    {selectedDate && new Date(selectedDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dayLessons.map((lesson) => {
                    const meta = ATTENDANCE_LABEL[lesson.attendance as string] || { label: lesson.attendance, color: 'bg-gray-100 text-gray-600' }
                    const isAbsent = ['absent', 'absent_notified', 'no_show', 'skipped', 'cancelled'].includes(lesson.attendance as string)
                    const canWriteComment = !isAbsent && (lesson.attendance === 'attended' || lesson.attendance === 'makeup_done' || lesson.attendance === 'scheduled')

                    return (
                      <div key={lesson.id} className="p-3 border border-gray-200 rounded-lg">
                        <p className="font-medium text-gray-900">{lesson.student_name}</p>
                        <p className="text-sm text-gray-600 mt-1">{lesson.session_number}회차</p>
                        <p className="text-sm text-gray-600">{formatLessonTime(lesson)}</p>

                        <div className={`mt-2 px-2 py-1 rounded text-xs font-medium inline-block ${meta.color}`}>
                          {meta.label}
                        </div>

                        {/* 결석/노쇼/스킵 — 코멘트 작성 차단 안내 */}
                        {isAbsent && (
                          <div className="mt-2 text-xs text-red-700 bg-red-50 p-2 rounded">
                            결석된 수업입니다. 코멘트 작성/강사료 정산 대상이 아닙니다.
                          </div>
                        )}

                        {/* 보강 요청 받음 (학부모 액션) — 슬롯 아직 제안 X → 슬롯 제안 폼 */}
                        {lesson.parent_post_absence_action === 'requested_makeup' && !lesson.makeup_proposed_date && (
                          <button
                            onClick={() => {
                              setMakeupLesson(lesson)
                              setMakeupDate('')
                              setMakeupStart('16:00')
                              setMakeupEnd('18:00')
                            }}
                            className="mt-3 w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg"
                          >
                            보강 슬롯 제안하기
                          </button>
                        )}

                        {/* 슬롯 제안 완료 — 학부모 승인 대기 */}
                        {lesson.makeup_proposed_date && !lesson.makeup_parent_approved && (
                          <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                            제안: {formatLessonTime({ lesson_date: lesson.makeup_proposed_date!, start_time: lesson.makeup_proposed_start || '', end_time: lesson.makeup_proposed_end || '' }).replace(/^/, lesson.makeup_proposed_date + ' ')} — 학부모 승인 대기
                          </div>
                        )}

                        {/* 보강 확정 — 학부모 승인 완료 */}
                        {lesson.makeup_parent_approved && lesson.makeup_proposed_date && (
                          <div className="mt-2 text-xs text-amber-800 bg-amber-100 p-2 rounded">
                            보강 확정: {lesson.makeup_proposed_date} {formatLessonTime({ lesson_date: lesson.makeup_proposed_date!, start_time: lesson.makeup_proposed_start || '', end_time: lesson.makeup_proposed_end || '' })}
                          </div>
                        )}

                        {/* 코멘트 작성 가능한 케이스 */}
                        {canWriteComment && lesson.comment_status === 'none' && (
                          <a
                            href={`/dashboard/my-comments?lesson=${lesson.id}`}
                            className="mt-2 inline-block text-xs text-indigo-600 hover:underline"
                          >
                            코멘트 작성하기 →
                          </a>
                        )}
                        {lesson.comment_status === 'submitted' && (
                          <span className="mt-2 inline-block text-xs text-blue-600">코멘트 제출됨 — 관리자 승인 대기</span>
                        )}
                        {lesson.comment_status === 'approved' && (
                          <span className="mt-2 inline-block text-xs text-green-600">코멘트 승인됨 ✓</span>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-600 py-8">날짜를 선택해주세요</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 보강 슬롯 제안 모달 */}
      {makeupLesson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMakeupLesson(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">보강 슬롯 제안</h3>
            <p className="text-sm text-gray-600 mb-4">
              {makeupLesson.student_name} · 원래 {makeupLesson.lesson_date} {trimTime(makeupLesson.start_time)}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">보강 날짜 (PST 기준)</label>
                <input type="date" value={makeupDate} onChange={(e) => setMakeupDate(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">시작 (PST)</label>
                  <input type="time" value={makeupStart} onChange={(e) => setMakeupStart(e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">종료 (PST)</label>
                  <input type="time" value={makeupEnd} onChange={(e) => setMakeupEnd(e.target.value)} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>
              <p className="text-xs text-gray-500">학부모 화면은 본인 시간대로 자동 변환됩니다.</p>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setMakeupLesson(null)} className="flex-1 px-4 py-2 border rounded font-medium hover:bg-gray-50">취소</button>
              <button onClick={handleProposeMakeup} className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded font-medium">제안 보내기</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-white z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.text}
        </div>
      )}
    </div>
  )
}
