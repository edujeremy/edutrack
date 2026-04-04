'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ChevronDown, ChevronUp } from 'lucide-react'
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
  const [selectedLesson, setSelectedLesson] = useState<LessonWithComment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null)

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

  const loadTeacherData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (!profileData) return
    setProfile(profileData)

    if (profileData.role === 'parent') {
      await loadParentData(user.id)
    } else {
      await loadTeacherLessons(user.id)
    }
  }

  const loadParentData = async (userId: string) => {
    const { data: students } = await supabase
      .from('students')
      .select('*')
      .eq('parent_id', userId)

    if (!students || students.length === 0) return

    const studentIds = students.map((s: any) => s.id)
    const { data: packages } = await supabase
      .from('packages')
      .select('*')
      .in('student_id', studentIds)

    if (!packages) return

    const packageIds = packages.map((p: Package) => p.id)
    const { data: lessonData } = await supabase
      .from('lessons')
      .select('*')
      .in('package_id', packageIds)

    if (!lessonData) return

    const { data: commentData } = await supabase
      .from('comments')
      .select('*')
      .in('lesson_id', lessonData.map((l: Lesson) => l.id))
      .eq('status', 'approved')

    const enrichedLessons = lessonData.map((lesson: Lesson) => {
      const pkg = packages.find((p: Package) => p.id === lesson.package_id)
      const student = students.find((s: any) => s.id === pkg?.student_id)
      const comment = (commentData || []).find((c: Comment) => c.lesson_id === lesson.id)
      return {
        ...lesson,
        comment,
        student_name: student?.name || 'Unknown',
        package_name: pkg?.name || 'Unknown',
      }
    })

    enrichedLessons.sort(
      (a, b) => new Date(b.lesson_date).getTime() - new Date(a.lesson_date).getTime()
    )
    setLessons(enrichedLessons)
  }

  const loadTeacherLessons = async (userId: string) => {
    const { data: teacherData } = await supabase
      .from('teachers')
      .select('*')
      .eq('profile_id', userId)
      .maybeSingle()

    if (!teacherData) return
    setTeacher(teacherData)

    const { data: packages } = await supabase
      .from('packages')
      .select('*')
      .eq('teacher_id', teacherData.id)

    if (!packages) return

    const { data: lessonData } = await supabase
      .from('lessons')
      .select('*')
      .in('package_id', packages.map((p: Package) => p.id))
      .in('attendance', ['attended', 'absent'])

    if (!lessonData) return

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
      const comment = (commentData || []).find((c: Comment) => c.lesson_id === lesson.id)
      return {
        ...lesson,
        comment,
        student_name: pkg ? studentMap.get(pkg.student_id) : 'Unknown',
        package_name: pkg?.name || 'Unknown',
      }
    })

    enrichedLessons.sort(
      (a, b) => new Date(b.lesson_date).getTime() - new Date(a.lesson_date).getTime()
    )
    setLessons(enrichedLessons)
  }

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        await loadTeacherData()
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
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

      const commentPayload = {
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
        await supabase
          .from('comments')
          .update(commentPayload)
          .eq('id', selectedLesson.comment.id)
      } else {
        await supabase
          .from('comments')
          .insert([commentPayload])
      }

      setIsModalOpen(false)
      // Reload data
      await loadTeacherData()
    } catch (error) {
      console.error('Error saving comment:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleExpand = (lessonId: string) => {
    setExpandedLessonId(prev => prev === lessonId ? null : lessonId)
  }

  const getStatusInfo = (comment: Comment | null | undefined) => {
    if (!comment) return { label: '미작성', color: 'bg-gray-100 text-gray-600', borderColor: 'border-l-4 border-gray-300' }
    switch (comment.status) {
      case 'approved':
        return { label: '승인완료', color: 'bg-green-100 text-green-700', borderColor: 'border-l-4 border-green-500' }
      case 'submitted':
        return { label: '제출완료', color: 'bg-blue-100 text-blue-700', borderColor: 'border-l-4 border-blue-500' }
      case 'rejected':
        return { label: '반려됨', color: 'bg-red-100 text-red-600', borderColor: 'border-l-4 border-red-500' }
      case 'draft':
        return { label: '임시저장', color: 'bg-yellow-100 text-yellow-700', borderColor: 'border-l-4 border-yellow-400' }
      default:
        return { label: '미작성', color: 'bg-gray-100 text-gray-600', borderColor: 'border-l-4 border-gray-300' }
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
        <div className="max-w-4xl mx-auto space-y-3">
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
              const statusInfo = getStatusInfo(comment)
              const isExpanded = expandedLessonId === lesson.id
              const hasComment = !!comment
              const dateStr = new Date(lesson.lesson_date).toLocaleDateString(
                'ko-KR',
                { month: 'short', day: 'numeric', weekday: 'short' }
              )

              return (
                <div key={lesson.id} className={`bg-white rounded-lg shadow-sm overflow-hidden ${statusInfo.borderColor}`}>
                  {/* Header row - always visible */}
                  <div
                    className={`p-4 flex items-center justify-between ${hasComment ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={() => hasComment && toggleExpand(lesson.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{lesson.student_name}</h3>
                        <p className="text-sm text-gray-500">{dateStr} · {lesson.session_number}회차</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>

                      {!isParent && !hasComment && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditComment(lesson); }}
                          className="px-3 py-1.5 text-sm bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
                        >
                          작성
                        </button>
                      )}

                      {!isParent && hasComment && (comment?.status === 'rejected' || comment?.status === 'draft') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditComment(lesson); }}
                          className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                        >
                          수정
                        </button>
                      )}

                      {hasComment && (
                        <span className="text-gray-400 ml-1">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expandable comment content */}
                  {hasComment && isExpanded && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3 bg-gray-50">
                      {comment?.rejection_reason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                          <p className="font-medium text-red-900">반려 사유</p>
                          <p className="text-red-700">{comment.rejection_reason}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs font-semibold text-indigo-600 mb-1">진도</p>
                          <p className="text-sm text-gray-800">{comment?.progress || '-'}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs font-semibold text-indigo-600 mb-1">과제평가</p>
                          <p className="text-sm text-gray-800">{comment?.homework_evaluation || '-'}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs font-semibold text-indigo-600 mb-1">잘한점</p>
                          <p className="text-sm text-gray-800">{comment?.strengths || '-'}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-gray-200">
                          <p className="text-xs font-semibold text-indigo-600 mb-1">아쉬운점</p>
                          <p className="text-sm text-gray-800">{comment?.improvements || '-'}</p>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-semibold text-indigo-600 mb-1">과제</p>
                        <p className="text-sm text-gray-800">{comment?.homework || '-'}</p>
                      </div>
                    </div>
                  )}
                </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">진도</label>
              <textarea
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                placeholder="수업 진도를 작성해주세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">과제평가</label>
              <textarea
                value={formData.homework_evaluation}
                onChange={(e) => setFormData({ ...formData, homework_evaluation: e.target.value })}
                placeholder="과제 평가를 작성해주세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">잘한점</label>
              <textarea
                value={formData.strengths}
                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                placeholder="학생의 강점을 작성해주세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">아쉬운점</label>
              <textarea
                value={formData.improvements}
                onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
                placeholder="개선이 필요한 부분을 작성해주세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">과제</label>
              <textarea
                value={formData.homework}
                onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
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
