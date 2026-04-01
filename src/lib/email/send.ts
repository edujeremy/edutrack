export interface EmailOptions {
  to: string
  subject: string
  template: 'consultation_reminder' | 'payment_due' | 'new_consultation' | 'application_update'
  data: Record<string, any>
}

/**
 * Resend를 통해 이메일을 발송합니다.
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    })

    if (!response.ok) {
      let errorMessage = '이메일 발송에 실패했습니다.'
      try {
        const error = await response.json()
        errorMessage = error.error || errorMessage
      } catch {
        // If response body is not JSON, use default error message
      }
      return {
        success: false,
        error: errorMessage,
      }
    }

    const result = await response.json()
    return {
      success: true,
      id: result.id,
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: '이메일을 발송하는 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 상담 일정 알림 이메일을 발송합니다.
 */
export async function sendConsultationReminderEmail(
  studentEmail: string,
  studentName: string,
  teacherName: string,
  consultationDate: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to: studentEmail,
    subject: '상담 일정 알림',
    template: 'consultation_reminder',
    data: {
      studentName,
      teacherName,
      date: consultationDate,
    },
  })
}

/**
 * 등록금 납부 안내 이메일을 발송합니다.
 */
export async function sendPaymentDueEmail(
  studentEmail: string,
  studentName: string,
  amount: number,
  dueDate: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to: studentEmail,
    subject: '등록금 납부 안내',
    template: 'payment_due',
    data: {
      studentName,
      amount,
      dueDate,
    },
  })
}

/**
 * 새로운 상담 등록 이메일을 발송합니다.
 */
export async function sendNewConsultationEmail(
  studentEmail: string,
  studentName: string,
  teacherName: string,
  consultationType: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to: studentEmail,
    subject: '새로운 상담이 등록되었습니다',
    template: 'new_consultation',
    data: {
      studentName,
      teacherName,
      type: consultationType,
    },
  })
}

/**
 * 입시 진행 상황 업데이트 이메일을 발송합니다.
 */
export async function sendApplicationUpdateEmail(
  studentEmail: string,
  studentName: string,
  university: string,
  status: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendEmail({
    to: studentEmail,
    subject: '입시 진행 상황 업데이트',
    template: 'application_update',
    data: {
      studentName,
      university,
      status,
    },
  })
}
