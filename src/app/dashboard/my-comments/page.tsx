'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Profile, Teacher, Lesson, Comment, Package } from '@/lib/types'

interface LessonWithComment extends Lesson {
  comment?: Comment | null
  student_name?: string
  package_name?: string
}

export default function MyCommentsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [lessons, setLessons] = useState<LessonWithComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<LessonWithComment | null>(
    null
  )
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Comment form state
  const [formData, setFormData] = useState({
    progress: '',
    homework_evaluation: '',
    strengths: '',
    improvements: '',
    homework: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

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

        // If parent, load approved comments for their students
        if (profileData.role === 'parent') {
          const { data: students } = await supabase
            .from('students')
            .select('*')
            .eq('parent_id', user.id)

          if (students && students.length > 0) {
            const studentIds = students.map((s: any) => s.id)
            const { data: packages } = await supabase
              .from('packages')
              .select('*')
              .in('student_id', studentIds)

            if (packages) {
              const packageIds = packages.map((p: Package) => p.id)
              const { data: lessonData } = await supabase
                .from('lessons')
                .select('*')
                .in('package_id', packageIds)

              if (lessonData) {
                const { data: commentData } = await supabase
                  .from('comments')
                  .select('*')
                  .in('lesson_id', lessonData.map((l: Lesson) => l.id))
                  .eq('status', 'approved')

                // Enrich with student and package names
                const enrichedLessons = lessonData.map((lesson: Lesson) => {
                  const pkg = packages.find((p: Package) => p.id === lesson.package_id)
                  const student = students.find(
                    (s: any) => s.id === pkg?.student_id
                  )
                  const comment = (commentData || []).find(
                    (c: Comment) => c.lesson_id === lesson.id
                  )
                  return {
                    ...lesson,
                    comment,
                    student_name: student?.name || 'Unknown',
                    package_name: pkg?.name || 'Unknown',
                  }
                })

                // Sort by date (recent first)
                enrichedLessons.sort(
                  (a, b) =>
                    new Date(b.lesson_date).getTime() -
                    new Date(a.lesson_date).getTime()
                )
                setLessons(enrichedLessons)
              }
            }
          }
        } else {
          // If teacher, load their lessons
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

          const { data: packages } = await supabase
            .from('packages')
            .select('*')
            .eq('teacher_id', teacherData.id)

          if (packages) {
            const { data: lessonData } = await supabase
              .from('lessons')
              .select('*')
              .in('package_id', packages.map((p: Package) => p.id))

            if (lessonData) {
              const { data: commentData } = await supabase
                .from('comments')
                .select('*')
                .in('lesson_id', lessonData.map((l: Lesson) => l.id))

              // Get student names
              const { data: studentsData } = await supabase
                .from('students')
                .select('id, name')

              const studentMap = new Map(
                (studentsData || []).map((s: any) => [s.id, s.name])
              )

              const enrichedLessons = lessonData.map((lesson: Lesson) => {
                const pkg = packages.find((p: Package) => p.id === lesson.package_id)
                const comment = (commentData || []).find(
                  (c: Comment) => c.lesson_id === lesson.id
                )
                return {
                  ...lesson,
                  comment,
                  student_name: pkg ? studentMap.get(pkg.student_id) : 'Unknown',
                  package_name: pkg?.name || 'Unknown',
                }
              })

              // Sort by date (recent first)
              enrichedLessons.sort(
                (a, b) =>
                  new Date(b.lesson_date).getTime() -
                  new Date(a.lesson_date).getTime()
              )
              setLessons(enrichedLessons)
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleEditComment = (lesson: LessonWithComment) => {
    setSelectedLesson(lesson)
    if (lesson.comment) {
      setFormData({
        progress: lesson.comment.progress,
        homework_evaluation: lesson.comment.homework_evaluation,
        strengths: lesson.comment.strengths,
        improvements: lesson.comment.improvements,
        homework: lesson.comment.homework,
      })
      setRejectionReason(lesson.comment.rejection_reason || '')
    } else {
      setFormData({
        progress: '',
        homework_evaluation: '',
        strengths: '',
        improvements: '',
        homework: '',
      })
      setRejectionReason('')
    }
    setIsModalOpen(true)
  }

  const handleSaveComment = async (asDraft: boolean) => {
    if (!selectedLesson) return

    try {
      setIsSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const commentData = {
        lesson_id: selectedLesson.id,
        teacher_id: teacher?.id || user.id,
        progress: formData.progress,
        homework_evaluation: formData.homework_evaluation,
        strengths: formData.strengths,
        improvements: formData.improvements,
        homework: formData.homework,
        status: asDraft ? 'draft' : 'submitted',
        submitted_at: asDraft ? null : new Date().toISOString(),
      }

      if (selectedLesson.comment?.id) {
        // Update existing comment
        await supabase
          .from('comments')
          .update(commentData)
          .eq('id', selectedLesson.comment.id)
      } else {
        // Create new comment
        await supabase
          .from('comments')
          .insert([commentData])
      }

      setIsModalOpen(false)

      // Reload lessons
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (profileData?.role === 'teacher') {
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('*')
          .eq('profile_id', currentUser.id)
          .maybeSingle()

        if (teacherData) {
          const { data: packages } = await supabase
            .from('packages')
            .select('*')
            .eq('teacher_id', teacherData.id)

          if (packages) {
            const { data: lessonData } = await supabase
              .from('lessons')
              .select('*')
              .in('package_id', packages.map((p: Package) => p.id))

            if (lessonData) {
              const { data: commentData } = await supabase
                .from('comments')
                .select('*')
                .in('lesson_id', lessonData.map((l: Lesson) => l.id))

              const { data: studentsData } = await supabase
                .from('students')
                .select('id, name')

              const studentMap = new Map(
                (studentsData || []).map((s: any) => [s.id, s.name])
              )

              const enrichedLessons = lessonData.map((lesson: Lesson) => {
                const pkg = packages.find((p: Package) => p.id === lesson.package_id)
                const comment = (commentData || []).find(
                  (c: Comment) => c.lesson_id === lesson.id
                )
                return {
                  ...lesson,
                  comment,
                  student_name: pkg ? studentMap.get(pkg.student_id) : 'Unknown',
                  package_name: pkg?.name || 'Unknown',
                }
              })

              enrichedLessons.sort(
                (a, b) =>
                  new Date(b.lesson_date).getTime() -
                  new Date(a.lesson_date).getTime()
              )
              setLessons(enrichedLessons)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error saving comment:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Header title={profile?.role === 'parent' ? '우리 아이 피드백' : '나의 코멘트'} />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" label="로딩 중..." />
        </div>
      </div>
    )
  }

  const isParent = profile?.role === 'parent'

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header title={isParent ? '우리 아이 피드백' : '나의 코멘트'} />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {lessons.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-600 py-8">
                  {isParent ? '아직 승인된 피드백이 없습니다' : '수업이 없습니다'}
                </p>
              </CardContent>
            </Card>
          ) : (
            lessons.map((lesson) => {
              const comment = lesson.comment
              const dateStr = new Date(lesson.lesson_date).toLocaleDateString(
                'ko-KR',
                {
                  month: 'short',
                  day: 'numeric',
                  weekday: 'short',
                }
              )
              const statusColor =
                comment?.status === 'approved'
                  ? 'border-l-4 border-green-500'
                  : comment?.status === 'submitted'
                    ? 'border-l-4 border-blue-500'
                    : comment?.status === 'rejected'
                      ? 'border-l-4 border-red-500'
                      : 'border-l-4 border-gray-300'

              return (
                <Card key={lesson.id} className={statusColor}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {lesson.student_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {dateStr} · {lesson.session_number}회차
                        </p>
                      </div>
                      {!isParent && (
                        <div className="flex items-center gap-2">
                          {comment?.status === 'rejected' && (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded">
                              반려됨
                            </span>
                          )}
                          {comment?.status === 'approved' && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded">
                              승인됨
                            </span>
                          )}
                          {comment?.status === 'submitted' && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
                              검토중
                            </span>
                          )}
                          {!comment && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              미작성
                            </span>
                          )}
                          <button
                            onClick={() => handleEditComment(lesson)}
                            className="px-3 py-1 text-sm bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
                          >
                            {comment ? '수정' : '작성'}
                          </button>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  {comment && (
                    <CardContent className="space-y-4">
                      {comment.rejection_reason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                          <p className="font-medium text-red-900">반려 사유</p>
                          <p className="text-red-700">{comment.rejection_reason}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          진도
                        </p>
                        <p className="text-gray-900">{comment.progress}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          과제평가
                        </p>
                        <p className="text-gray-900">{comment.homework_evaluation}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          잘한점
                        </p>
                        <p className="text-gray-900">{comment.strengths}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          아쉬운점
                        </p>
                        <p className="text-gray-900">{comment.improvements}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          과제
                        </p>
                        <p className="text-gray-900">{comment.homework}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Comment Modal */}
      {!isParent && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`${selectedLesson?.student_name} - 코멘트 ${selectedLesson?.session_number}회차`}
        >
          <div className="space-y-4">
            {rejectionReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm font-medium text-red-900">반려 사유</p>
                <p className="text-sm text-red-700">{rejectionReason}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                진도
              </label>
              <textarea
                value={formData.progress}
                onChange={(e) =>
                  setFormData({ ...formData, progress: e.target.value })
                }
                placeholder="수업 진도를 작성해주세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                과제평가
              </label>
              <textarea
                value={formData.homework_evaluation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    homework_evaluation: e.target.value,
                  })
                }
                placeholder="과제 평가를 작성해주세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                잘한점
              </label>
              <textarea
                value={formData.strengths}
                onChange={(e) =>
                  setFormData({ ...formData, strengths: e.target.value })
                }
                placeholder="학생의 강점을 작성해주세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                아쉬운점
              </label>
              <textarea
                value={formData.improvements}
                onChange={(e) =>
                  setFormData({ ...formData, improvements: e.target.value })
                }
                placeholder="개선이 필요한 부분을 작성해주세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                과제
              </label>
              <textarea
                value={formData.homework}
                onChange={(e) =>
                  setFormData({ ...formData, homework: e.target.value })
                }
                placeholder="다음 수업까지의 과제를 작성해주세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => handleSaveComment(true)}
                disabled={isSaving}
                className="flex-1 bg-gray-500 hover:bg-gray-600"
              >
                {isSaving ? '저장 중...' : '임시저장'}
              </Button>
              <Button
                onClick={() => handleSaveComment(false)}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? '제출 중...' : '제출'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
