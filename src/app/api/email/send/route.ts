import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getCurrentUser } from '@/lib/auth'
import {
  consultationReminderEmail,
  paymentDueEmail,
  newConsultationEmail,
  applicationUpdateEmail,
} from '@/lib/email/templates'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

type EmailTemplate =
  | 'consultation_reminder'
  | 'payment_due'
  | 'new_consultation'
  | 'application_update'

interface EmailRequest {
  to: string
  subject: string
  template: EmailTemplate
  data: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // Resend API 키 확인
    if (!resend) {
      return NextResponse.json(
        { error: '이메일 서비스가 설정되지 않았습니다.' },
        { status: 503 }
      )
    }

    const body: EmailRequest = await request.json()
    const { to, subject, template, data } = body

    if (!to || !subject || !template) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    let html: string

    switch (template) {
      case 'consultation_reminder':
        html = consultationReminderEmail(
          data.studentName,
          data.teacherName,
          data.date
        )
        break

      case 'payment_due':
        html = paymentDueEmail(
          data.studentName,
          data.amount,
          data.dueDate
        )
        break

      case 'new_consultation':
        html = newConsultationEmail(
          data.studentName,
          data.teacherName,
          data.type
        )
        break

      case 'application_update':
        html = applicationUpdateEmail(
          data.studentName,
          data.university,
          data.status
        )
        break

      default:
        return NextResponse.json(
          { error: '알 수 없는 이메일 템플릿입니다.' },
          { status: 400 }
        )
    }

    if (!resend) {
      return NextResponse.json(
        { error: '이메일 서비스가 설정되지 않았습니다. RESEND_API_KEY를 확인해주세요.' },
        { status: 503 }
      )
    }

    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@edutrack.com',
      to,
      subject,
      html,
    })

    if (response.error) {
      return NextResponse.json(
        { error: '이메일 발송에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: response.data?.id })
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: '이메일을 발송하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
