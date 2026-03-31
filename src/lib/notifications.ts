import { Notification } from '@/lib/types'

export interface CreateNotificationOptions {
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  action_url?: string
}

/**
 * API를 통해 알림을 생성합니다.
 */
export async function createNotification(
  userId: string,
  options: CreateNotificationOptions
): Promise<Notification | null> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        ...options,
      }),
    })

    if (!response.ok) {
      console.error('Failed to create notification:', await response.text())
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

/**
 * 상담 일정 알림을 생성합니다.
 */
export async function notifyConsultationReminder(
  userId: string,
  studentName: string,
  teacherName: string,
  consultationDate: string,
  consultationId: string
): Promise<Notification | null> {
  const date = new Date(consultationDate).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return createNotification(userId, {
    title: '📅 상담 일정 알림',
    message: `${studentName}님의 ${teacherName} 선생님과의 상담이 ${date}에 예정되어 있습니다.`,
    type: 'info',
    action_url: `/dashboard/consultations/${consultationId}`,
  })
}

/**
 * 등록금 납부 알림을 생성합니다.
 */
export async function notifyPaymentDue(
  userId: string,
  studentName: string,
  amount: number,
  dueDate: string,
  paymentId: string
): Promise<Notification | null> {
  const date = new Date(dueDate).toLocaleDateString('ko-KR')
  const formattedAmount = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)

  return createNotification(userId, {
    title: '💳 등록금 납부 안내',
    message: `${studentName}님의 ${formattedAmount} 등록금이 ${date}까지 납부되어야 합니다.`,
    type: 'warning',
    action_url: `/dashboard/payments/${paymentId}`,
  })
}

/**
 * 새로운 상담 등록 알림을 생성합니다.
 */
export async function notifyNewConsultation(
  userId: string,
  studentName: string,
  teacherName: string,
  consultationType: string,
  consultationId: string
): Promise<Notification | null> {
  const typeLabel: { [key: string]: string } = {
    academic: '학습 상담',
    career: '진로 상담',
    university: '대학 입시 상담',
    general: '일반 상담',
  }

  return createNotification(userId, {
    title: '💬 새로운 상담이 등록되었습니다',
    message: `${studentName}님의 ${teacherName} 선생님과의 ${
      typeLabel[consultationType] || consultationType
    }이 등록되었습니다.`,
    type: 'success',
    action_url: `/dashboard/consultations/${consultationId}`,
  })
}

/**
 * 입시 진행 상황 업데이트 알림을 생성합니다.
 */
export async function notifyApplicationUpdate(
  userId: string,
  studentName: string,
  university: string,
  status: string,
  applicationId: string
): Promise<Notification | null> {
  const statusLabel: { [key: string]: string } = {
    draft: '작성 중',
    submitted: '제출 완료',
    accepted: '합격',
    rejected: '불합격',
    waitlisted: '대기 중',
  }

  const emoji: { [key: string]: string } = {
    draft: '📝',
    submitted: '✉️',
    accepted: '🎓',
    rejected: '❌',
    waitlisted: '⏳',
  }

  return createNotification(userId, {
    title: `${emoji[status] || '📋'} 입시 진행 상황 업데이트`,
    message: `${studentName}님의 ${university} ${
      statusLabel[status] || status
    } 상태로 변경되었습니다.`,
    type: status === 'accepted' ? 'success' : status === 'rejected' ? 'error' : 'info',
    action_url: `/dashboard/applications/${applicationId}`,
  })
}

/**
 * 시간이 지난 상담 알림을 생성합니다. (사후 알림)
 */
export async function notifyCompletedConsultation(
  userId: string,
  studentName: string,
  teacherName: string,
  consultationId: string
): Promise<Notification | null> {
  return createNotification(userId, {
    title: '✅ 상담이 완료되었습니다',
    message: `${studentName}님과 ${teacherName} 선생님의 상담이 완료되었습니다.`,
    type: 'success',
    action_url: `/dashboard/consultations/${consultationId}`,
  })
}

/**
 * 스케줄 변경 알림을 생성합니다.
 */
export async function notifyScheduleChange(
  userId: string,
  studentName: string,
  subject: string,
  dayOfWeek: number,
  startTime: string,
  scheduleId: string
): Promise<Notification | null> {
  const dayLabel = ['일', '월', '화', '수', '목', '금', '토'][dayOfWeek]

  return createNotification(userId, {
    title: '📅 수업 일정 변경',
    message: `${studentName}님의 ${subject} 수업이 ${dayLabel}요일 ${startTime}으로 변경되었습니다.`,
    type: 'info',
    action_url: `/dashboard/schedules/${scheduleId}`,
  })
}

/**
 * 일반 알림을 생성합니다.
 */
export async function notifyGeneral(
  userId: string,
  title: string,
  message: string,
  actionUrl?: string,
  type?: 'info' | 'success' | 'warning' | 'error'
): Promise<Notification | null> {
  return createNotification(userId, {
    title,
    message,
    type: type || 'info',
    action_url: actionUrl,
  })
}
