'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Profile, Teacher, Package, Lesson, Comment } from '@/lib/types'

interface LessonWithComment extends Lesson {
  comment?: Comment | null
  student_name?: string
}

interface DayLessons {
  date: string
  lessons: LessonWithComment[]
}

export default function MyLessonsPage() {
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [profile, setProfile] = useState<Profile | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [dayLessons, setDayLessons] = useState<DayLessons | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Map to store comment status for each lesson
  const [commentMap, setCommentMap] = useState<Map<string, string>>(new Map())

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

        // Get packages for this teacher
        const { data: packages } = await supabase
          .from('packages')
          .select('*')
          .eq('teacher_id', teacherData.id)

        if (!packages) {
          setIsLoading(false)
          return
        }

        // Get all lessons and comments for this teacher
        const { data: lessons } = await supabase
          .from('lessons')
          .select('*')
          .in('package_id', packages.map((p: Package) => p.id))

        if (lessons) {
          // Get student names for lessons
          const { data: studentsData } = await supabase
            .from('students')
            .select('id, name')

          const studentMap = new Map(
            (studentsData || []).map((s: any) => [s.id, s.name])
          )

          // Get comments and build map
          const { data: commentsData } = await supabase
            .from('comments')
            .select('*')
            .in('lesson_id', lessons.map((l: Lesson) => l.id))

          const comments = new Map(
            (commentsData || []).map((c: Comment) => [c.lesson_id, c])
          )

          // Build comment status map
          const newMap = new Map<string, string>()
          lessons.forEach((lesson: Lesson) => {
            const comment = comments.get(lesson.id)
            newMap.set(lesson.id, comment?.status || 'none')
          })
          setCommentMap(newMap)

          // Enrich lessons with student names
          const enrichedLessons = lessons.map((lesson: Lesson) => {
            const pkg = packages.find((p: Package) => p.id === lesson.package_id)
            return {
              ...lesson,
              student_name: pkg ? studentMap.get(pkg.student_id) : 'Unknown',
            }
          })

          // Store for rendering
          ;(window as any).__lessonData = enrichedLessons
        }
      } catch (error) {
        console.error('Error loading lessons:', error)
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

  const getLessonStatusForDate = (dateStr: string): string => {
    const lessons = ((window as any).__lessonData || []) as LessonWithComment[]
    const lessonsForDate = lessons.filter((l) => l.lesson_date === dateStr)

    if (lessonsForDate.length === 0) return 'none'

    // Check statuses: if any approved, show approved; if any submitted, show submitted; else show draft/none
    const hasApproved = lessonsForDate.some(
      (l) => commentMap.get(l.id) === 'approved'
    )
    const hasSubmitted = lessonsForDate.some(
      (l) => commentMap.get(l.id) === 'submitted'
    )
    const hasNone = lessonsForDate.some((l) => commentMap.get(l.id) === 'none')

    if (hasApproved) return 'approved'
    if (hasSubmitted) return 'submitted'
    if (hasNone) return 'none'
    return 'draft'
  }

  const handleSelectDate = async (dateStr: string) => {
    setSelectedDate(dateStr)
    const lessons = ((window as any).__lessonData || []) as LessonWithComment[]
    const lessonsForDate = lessons.filter((l) => l.lesson_date === dateStr)

    if (lessonsForDate.length > 0) {
      setDayLessons({
        date: dateStr,
        lessons: lessonsForDate,
      })
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    )
    setSelectedDate(null)
    setDayLessons(null)
  }

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    )
    setSelectedDate(null)
    setDayLessons(null)
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

  const getDateColor = (dateStr: string | null) => {
    if (!dateStr) return ''
    const status = getLessonStatusForDate(dateStr)
    switch (status) {
      case 'approved':
        return 'bg-green-100 border-l-4 border-green-500'
      case 'submitted':
        return 'bg-blue-100 border-l-4 border-blue-500'
      case 'none':
        return 'bg-orange-100 border-l-4 border-orange-500'
      default:
        return 'bg-gray-50'
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header title="내 수업일정" />

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
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
                  {calendarDays.map((dateStr, idx) => (
                    <button
                      key={idx}
                      onClick={() => dateStr && handleSelectDate(dateStr)}
                      className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                        dateStr
                          ? `${getDateColor(dateStr)} hover:shadow-md cursor-pointer`
                          : 'text-gray-300 cursor-default'
                      } ${selectedDate === dateStr ? 'ring-2 ring-indigo-500' : ''}`}
                    >
                      {dateStr ? new Date(dateStr).getDate() : ''}
                    </button>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-4 h-4 bg-green-100 border-l-4 border-green-500"></div>
                    <span className="text-gray-600">승인됨</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-4 h-4 bg-blue-100 border-l-4 border-blue-500"></div>
                    <span className="text-gray-600">제출함</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-4 h-4 bg-orange-100 border-l-4 border-orange-500"></div>
                    <span className="text-gray-600">미작성</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected day details */}
          <div className="lg:col-span-1">
            {dayLessons ? (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">
                    {new Date(dayLessons.date).toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short',
                    })}
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dayLessons.lessons.map((lesson) => {
                    const status = commentMap.get(lesson.id) || 'none'
                    const statusColor =
                      status === 'approved'
                        ? 'text-green-600 bg-green-50'
                        : status === 'submitted'
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-orange-600 bg-orange-50'
                    const statusLabel =
                      status === 'approved'
                        ? '승인됨'
                        : status === 'submitted'
                          ? '제출함'
                          : '미작성'

                    return (
                      <div
                        key={lesson.id}
                        className="p-3 border border-gray-200 rounded-lg"
                      >
                        <p className="font-medium text-gray-900">
                          {lesson.student_name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {lesson.session_number}회차
                        </p>
                        <p className="text-sm text-gray-600">
                          {lesson.start_time} - {lesson.end_time}
                        </p>
                        <div className={`mt-2 px-2 py-1 rounded text-xs font-medium inline-block ${statusColor}`}>
                          {statusLabel}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-600 py-8">
                    날짜를 선택해주세요
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
