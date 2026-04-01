'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import type { Profile, Student, Package, Lesson, Comment } from '@/lib/types'

interface LessonWithComment extends Lesson {
  comment?: Comment | null
  student_name?: string
  package_name?: string
  teacher_name?: string
}

export default function CalendarPage() {
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [profile, setProfile] = useState<Profile | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [lessons, setLessons] = useState<LessonWithComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayLessons, setDayLessons] = useState<LessonWithComment[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Map to store lesson details
  const [lessonMap, setLessonMap] = useState<Map<string, LessonWithComment>>(
    new Map()
  )

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

        if (!studentsData || studentsData.length === 0) {
          setIsLoading(false)
          return
        }
        setStudents(studentsData)

        // Get packages for these students
        const { data: packages } = await supabase
          .from('packages')
          .select('*')
          .in('student_id', studentsData.map((s: Student) => s.id))

        if (!packages || packages.length === 0) {
          setIsLoading(false)
          return
        }

        // Get lessons for these packages
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('*')
          .in('package_id', packages.map((p: Package) => p.id))

        if (lessonsData) {
          // Get comments for lessons
          const { data: commentsData } = await supabase
            .from('comments')
            .select('*')
            .in('lesson_id', lessonsData.map((l: Lesson) => l.id))

          // Get teacher names
          const { data: teachersData } = await supabase
            .from('teachers')
            .select('id, profile_id')

          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name')

          const profileMap = new Map(
            (profilesData || []).map((p: any) => [p.id, p.name])
          )

          // Enrich lessons with details
          const enrichedLessons = lessonsData.map((lesson: Lesson) => {
            const pkg = packages.find((p: Package) => p.id === lesson.package_id)
            const student = studentsData.find(
              (s: Student) => s.id === pkg?.student_id
            )
            const teacher = (teachersData || []).find(
              (t: any) => t.id === pkg?.teacher_id
            )
            const comment = (commentsData || []).find(
              (c: Comment) => c.lesson_id === lesson.id
            )

            return {
              ...lesson,
              comment,
              student_name: student?.name || 'Unknown',
              package_name: pkg?.name || 'Unknown',
              teacher_name: teacher
                ? profileMap.get(teacher.profile_id)
                : 'Unknown',
            }
          })

          setLessons(enrichedLessons)

          // Build map for quick lookup
          const newMap = new Map<string, LessonWithComment>()
          enrichedLessons.forEach((lesson) => {
            newMap.set(lesson.id, lesson)
          })
          setLessonMap(newMap)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getLessonColorForDate = (dateStr: string): string => {
    const lessonsForDate = lessons.filter((l) => l.lesson_date === dateStr)

    if (lessonsForDate.length === 0) return ''

    // Priority: approved comment > attended > absent > scheduled
    if (lessonsForDate.some((l) => l.comment?.status === 'approved')) {
      return 'bg-purple-100 border-l-4 border-purple-500'
    }
    if (lessonsForDate.some((l) => l.attendance === 'attended')) {
      return 'bg-green-100 border-l-4 border-green-500'
    }
    if (lessonsForDate.some((l) => l.attendance === 'absent')) {
      return 'bg-red-100 border-l-4 border-red-500'
    }
    return 'bg-blue-100 border-l-4 border-blue-500'
  }

  const handleSelectDate = (dateStr: string) => {
    const lessonsForDate = lessons.filter((l) => l.lesson_date === dateStr)
    if (lessonsForDate.length > 0) {
      setSelectedDate(dateStr)
      setDayLessons(lessonsForDate)
      setIsModalOpen(true)
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    )
  }

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="수업일정" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" label="로딩 중..." />
        </div>
      </div>
    )
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDayOfMonth = getFirstDayOfMonth(currentDate)
  const monthName = currentDate.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
  })

  const calendarDays = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    calendarDays.push(dateStr)
  }

  // Calculate package progress
  const packageProgress = students.map((student) => {
    const studentPackages = lessons.filter(
      (l) => l.student_name === student.name
    )
    const packageInfo = studentPackages.length > 0
      ? (() => {
          const firstLesson = studentPackages[0]
          return {
            name: firstLesson.package_name,
            total: 8, // Default, would need to fetch from Package table
          }
        })()
      : null

    return { student, packageInfo }
  })

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header title="수업일정" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <h2 className="text-xl font-semibold text-gray-900">
                  {monthName}
                </h2>
                <button
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </CardHeader>

            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                  <div
                    key={day}
                    className="text-center font-semibold text-gray-600 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((dateStr, idx) => {
                  const colorClass = dateStr
                    ? getLessonColorForDate(dateStr)
                    : ''
                  const hasLessons = dateStr
                    ? lessons.some((l) => l.lesson_date === dateStr)
                    : false

                  return (
                    <button
                      key={idx}
                      onClick={() => dateStr && handleSelectDate(dateStr)}
                      className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                        dateStr
                          ? `${colorClass} ${
                              hasLessons
                                ? 'cursor-pointer hover:shadow-md'
                                : 'cursor-default'
                            }`
                          : 'text-gray-300 cursor-default'
                      }`}
                      disabled={!hasLessons}
                    >
                      {dateStr ? new Date(dateStr).getDate() : ''}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 bg-purple-100 border-l-4 border-purple-500"></div>
                  <span className="text-gray-600">피드백 있음</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 bg-green-100 border-l-4 border-green-500"></div>
                  <span className="text-gray-600">출석</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 bg-red-100 border-l-4 border-red-500"></div>
                  <span className="text-gray-600">결석</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 bg-blue-100 border-l-4 border-blue-500"></div>
                  <span className="text-gray-600">예정됨</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Package Progress */}
          {students.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  수업 진행 현황
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {packageProgress.map(({ student, packageInfo }) => (
                    <div key={student.id}>
                      <p className="font-medium text-gray-900 mb-2">
                        {student.name}
                      </p>
                      {packageInfo ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {Array.from({ length: 8 }).map((_, idx) => (
                            <div
                              key={idx}
                              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                                idx < 4
                                  ? 'bg-green-100 text-green-700 border border-green-300'
                                  : 'bg-gray-100 text-gray-600 border border-gray-300'
                              }`}
                            >
                              {idx + 1}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          진행 중인 수업이 없습니다
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Lesson Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          selectedDate
            ? new Date(selectedDate).toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })
            : ''
        }
      >
        <div className="space-y-4">
          {dayLessons.map((lesson) => (
            <div key={lesson.id} className="border border-gray-200 rounded-lg p-4">
              <div className="mb-3">
                <p className="font-medium text-gray-900">{lesson.student_name}</p>
                <p className="text-sm text-gray-600">
                  {lesson.session_number}회차 · {lesson.teacher_name}
                </p>
                <p className="text-sm text-gray-600">
                  {lesson.start_time} - {lesson.end_time}
                </p>
              </div>

              <div
                className={`px-2 py-1 rounded text-xs font-medium inline-block mb-3 ${
                  lesson.attendance === 'attended'
                    ? 'bg-green-100 text-green-600'
                    : lesson.attendance === 'absent'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-blue-100 text-blue-600'
                }`}
              >
                {lesson.attendance === 'attended'
                  ? '출석'
                  : lesson.attendance === 'absent'
                    ? '결석'
                    : '예정'}
              </div>

              {lesson.comment?.status === 'approved' && (
                <div className="mt-3 space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="text-xs font-medium text-gray-600">진도</p>
                    <p className="text-sm text-gray-900">{lesson.comment.progress}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-600">과제평가</p>
                    <p className="text-sm text-gray-900">
                      {lesson.comment.homework_evaluation}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-600">잘한점</p>
                    <p className="text-sm text-gray-900">
                      {lesson.comment.strengths}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-600">아쉬운점</p>
                    <p className="text-sm text-gray-900">
                      {lesson.comment.improvements}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-600">과제</p>
                    <p className="text-sm text-gray-900">{lesson.comment.homework}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
