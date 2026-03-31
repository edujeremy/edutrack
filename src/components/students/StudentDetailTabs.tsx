'use client'

import { useState } from 'react'
import { Student, Profile, Consultation, UniversityApplication, Schedule, Payment } from '@/lib/types'
import { Calendar, FileText, BookOpen, DollarSign } from 'lucide-react'

interface StudentDetailTabsProps {
  student: Student & { profile: Profile; teacher?: Profile | null }
  consultations?: Consultation[]
  applications?: UniversityApplication[]
  schedules?: Schedule[]
  payments?: Payment[]
  onEditClick?: () => void
}

type TabType = 'basic' | 'consultations' | 'applications' | 'schedules' | 'payments'

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'basic', label: '기본정보', icon: <FileText className="h-4 w-4" /> },
  { id: 'consultations', label: '상담기록', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'applications', label: '지원현황', icon: <Calendar className="h-4 w-4" /> },
  { id: 'schedules', label: '수업일정', icon: <Calendar className="h-4 w-4" /> },
  { id: 'payments', label: '결제내역', icon: <DollarSign className="h-4 w-4" /> },
]

const dayOfWeekMap: { [key: number]: string } = {
  0: '일요일',
  1: '월요일',
  2: '화요일',
  3: '수요일',
  4: '목요일',
  5: '금요일',
  6: '토요일',
}

export function StudentDetailTabs({
  student,
  consultations = [],
  applications = [],
  schedules = [],
  payments = [],
  onEditClick,
}: StudentDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic')

  const renderBasicInfo = () => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-gray-500">이름</p>
          <p className="text-base font-medium text-gray-900">{student.profile.name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">학교</p>
          <p className="text-base font-medium text-gray-900">{student.school || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">학년</p>
          <p className="text-base font-medium text-gray-900">
            {student.grade ? `${student.grade}학년` : '-'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">담당선생님</p>
          <p className="text-base font-medium text-gray-900">
            {student.teacher?.name || '-'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">이메일</p>
          <p className="text-base font-medium text-gray-900">
            {student.profile.email || '-'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">연락처</p>
          <p className="text-base font-medium text-gray-900">
            {student.profile.phone || '-'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">학부모 이름</p>
          <p className="text-base font-medium text-gray-900">
            {student.parent_name || '-'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">학부모 연락처</p>
          <p className="text-base font-medium text-gray-900">
            {student.parent_phone || '-'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">학부모 이메일</p>
          <p className="text-base font-medium text-gray-900">
            {student.parent_email || '-'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">등록일</p>
          <p className="text-base font-medium text-gray-900">
            {new Date(student.enrollment_date).toLocaleDateString('ko-KR')}
          </p>
        </div>
      </div>
    </div>
  )

  const renderConsultations = () => (
    <div className="space-y-4">
      {consultations.length === 0 ? (
        <p className="text-center text-gray-500">등록된 상담기록이 없습니다.</p>
      ) : (
        consultations.map((consultation) => (
          <div
            key={consultation.id}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {new Date(consultation.consultation_date).toLocaleDateString('ko-KR')}
                </p>
                {consultation.topics && consultation.topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {consultation.topics.map((topic) => (
                      <span
                        key={topic}
                        className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {consultation.notes && (
              <p className="mt-3 text-sm text-gray-600">{consultation.notes}</p>
            )}
          </div>
        ))
      )}
    </div>
  )

  const renderApplications = () => (
    <div className="space-y-4">
      {applications.length === 0 ? (
        <p className="text-center text-gray-500">등록된 대학 지원이 없습니다.</p>
      ) : (
        applications.map((app) => (
          <div key={app.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{app.university_name}</h4>
                <p className="text-sm text-gray-600">{app.major}</p>
              </div>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                  {
                    draft: 'bg-gray-100 text-gray-800',
                    submitted: 'bg-blue-100 text-blue-800',
                    accepted: 'bg-green-100 text-green-800',
                    rejected: 'bg-red-100 text-red-800',
                    waitlisted: 'bg-yellow-100 text-yellow-800',
                  }[app.status]
                }`}
              >
                {
                  {
                    draft: '작성 중',
                    submitted: '제출됨',
                    accepted: '합격',
                    rejected: '불합격',
                    waitlisted: '대기',
                  }[app.status]
                }
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {new Date(app.application_date).toLocaleDateString('ko-KR')}
            </p>
            {app.notes && <p className="mt-3 text-sm text-gray-600">{app.notes}</p>}
          </div>
        ))
      )}
    </div>
  )

  const renderSchedules = () => (
    <div className="space-y-4">
      {schedules.length === 0 ? (
        <p className="text-center text-gray-500">등록된 수업일정이 없습니다.</p>
      ) : (
        schedules
          .filter((s) => s.is_active)
          .map((schedule) => (
            <div key={schedule.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{schedule.subject}</h4>
                  <p className="text-sm text-gray-600">
                    {dayOfWeekMap[schedule.day_of_week] || ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {schedule.start_time} ~ {schedule.end_time}
                  </p>
                  {schedule.room && (
                    <p className="text-sm text-gray-600">{schedule.room}</p>
                  )}
                </div>
              </div>
            </div>
          ))
      )}
    </div>
  )

  const renderPayments = () => (
    <div className="space-y-4">
      {payments.length === 0 ? (
        <p className="text-center text-gray-500">등록된 결제내역이 없습니다.</p>
      ) : (
        payments.map((payment) => (
          <div key={payment.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{payment.description || '수강료'}</p>
                <p className="text-sm text-gray-600">
                  {new Date(payment.payment_date).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  ₩{payment.amount.toLocaleString('ko-KR')}
                </p>
                <span
                  className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                    {
                      pending: 'bg-yellow-100 text-yellow-800',
                      completed: 'bg-green-100 text-green-800',
                      failed: 'bg-red-100 text-red-800',
                      refunded: 'bg-gray-100 text-gray-800',
                    }[payment.status]
                  }`}
                >
                  {
                    {
                      pending: '대기',
                      completed: '완료',
                      failed: '실패',
                      refunded: '환불',
                    }[payment.status]
                  }
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicInfo()
      case 'consultations':
        return renderConsultations()
      case 'applications':
        return renderApplications()
      case 'schedules':
        return renderSchedules()
      case 'payments':
        return renderPayments()
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8 overflow-x-auto sm:gap-12">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-1 py-4 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>{renderContent()}</div>
    </div>
  )
}
