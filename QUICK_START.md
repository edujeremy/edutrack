# EduTrack 알림·이메일·설정 시스템 빠른 시작 가이드

## 📦 설치 및 설정

### 1. 환경 변수 설정
`.env.local` 파일에 다음을 추가하세요:

```env
# Resend 이메일 서비스
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@edutrack.com
```

### 2. Resend 계정 생성
1. [Resend](https://resend.com) 방문
2. 계정 생성 및 API 키 발급
3. 발신자 이메일 검증

---

## 🚀 빠른 사용 예시

### 1. 알림 생성

```typescript
import { createNotification } from '@/lib/notifications'

// 기본 알림 생성
await createNotification(userId, {
  title: '새로운 메시지',
  message: '새로운 상담이 예약되었습니다.',
  type: 'info',
  action_url: '/dashboard/consultations/123'
})
```

### 2. 사전 정의된 알림 사용

```typescript
import {
  notifyConsultationReminder,
  notifyPaymentDue,
  notifyNewConsultation,
  notifyApplicationUpdate
} from '@/lib/notifications'

// 상담 일정 알림
await notifyConsultationReminder(
  userId,
  '김학생',
  '이선생',
  '2026-04-01T14:00:00',
  'consultation-123'
)

// 등록금 납부 알림
await notifyPaymentDue(
  userId,
  '김학생',
  500000,
  '2026-04-05',
  'payment-123'
)

// 새로운 상담 알림
await notifyNewConsultation(
  userId,
  '김학생',
  '이선생',
  'academic',
  'consultation-123'
)

// 입시 진행 상황 알림
await notifyApplicationUpdate(
  userId,
  '김학생',
  '서울대학교',
  'accepted',
  'application-123'
)
```

### 3. 이메일 발송

```typescript
import {
  sendConsultationReminderEmail,
  sendPaymentDueEmail,
  sendNewConsultationEmail,
  sendApplicationUpdateEmail
} from '@/lib/email/send'

// 상담 일정 알림 이메일
await sendConsultationReminderEmail(
  'student@example.com',
  '김학생',
  '이선생',
  '2026-04-01T14:00:00'
)

// 등록금 납부 안내 이메일
await sendPaymentDueEmail(
  'student@example.com',
  '김학생',
  500000,
  '2026-04-05'
)

// 새로운 상담 등록 이메일
await sendNewConsultationEmail(
  'student@example.com',
  '김학생',
  '이선생',
  'academic'
)

// 입시 진행 상황 업데이트 이메일
await sendApplicationUpdateEmail(
  'student@example.com',
  '김학생',
  '서울대학교',
  'accepted'
)
```

### 4. 컴포넌트에서 알림 벨 사용

```typescript
import { NotificationBell } from '@/components/notifications/NotificationBell'

export function Header() {
  return (
    <header className="flex items-center justify-between">
      <h1>EduTrack</h1>
      <NotificationBell />
    </header>
  )
}
```

### 5. 알림 목록 페이지

```
경로: /dashboard/notifications
기능:
- 모든 알림 조회
- "전체" / "읽지않음" 필터링
- 모두 읽음으로 표시
- 알림 클릭 시 읽음 처리 및 이동
```

### 6. 설정 페이지

```
경로: /dashboard/settings
기능:
- 프로필 수정 (이름, 휴대폰)
- 비밀번호 변경
- 알림 설정 (각 유형별 on/off)
- 관리자 도구 (관리자만)
```

---

## 💡 실제 활용 사례

### 상담 생성 시 자동 알림 및 이메일

```typescript
// server action 또는 API 라우트에서
import { notifyNewConsultation } from '@/lib/notifications'
import { sendNewConsultationEmail } from '@/lib/email/send'

async function createConsultation(data) {
  const supabase = await createClient()

  // 상담 생성
  const { data: consultation } = await supabase
    .from('consultations')
    .insert({
      student_id: data.studentId,
      teacher_id: data.teacherId,
      consultation_date: data.date,
      topics: data.topics
    })
    .select()
    .single()

  // 학생 정보 조회
  const { data: student } = await supabase
    .from('students')
    .select('*, profile:profiles(*)')
    .eq('id', data.studentId)
    .single()

  const { data: teacher } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.teacherId)
    .single()

  // 알림 생성
  await notifyNewConsultation(
    student.profile.user_id,
    student.profile.name,
    teacher.name,
    'academic',
    consultation.id
  )

  // 이메일 발송
  await sendNewConsultationEmail(
    student.profile.email,
    student.profile.name,
    teacher.name,
    'academic'
  )
}
```

### 등록금 납부 기한 알림 스케줄 (예정된 작업)

```typescript
// cron job 또는 scheduled task로 매달 1일 실행
import { notifyPaymentDue } from '@/lib/notifications'
import { sendPaymentDueEmail } from '@/lib/email/send'

export async function sendPaymentReminders() {
  const supabase = await createClient()

  // 7일 내에 납부 기한이 있는 미납금 조회
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const sevenDaysLater = new Date()
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      student:students(
        *,
        profile:profiles(*)
      )
    `)
    .eq('status', 'pending')
    .gte('due_date', tomorrow.toISOString())
    .lte('due_date', sevenDaysLater.toISOString())

  for (const payment of payments || []) {
    const student = payment.student
    const profile = student.profile

    // 알림 생성
    await notifyPaymentDue(
      profile.user_id,
      profile.name,
      payment.amount,
      payment.due_date,
      payment.id
    )

    // 이메일 발송
    await sendPaymentDueEmail(
      profile.email,
      profile.name,
      payment.amount,
      payment.due_date
    )
  }
}
```

---

## 📋 API 엔드포인트 요약

### 알림 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/notifications` | 알림 목록 조회 |
| GET | `/api/notifications?unread_only=true` | 읽지 않은 알림만 조회 |
| POST | `/api/notifications` | 알림 생성 |
| PATCH | `/api/notifications/[id]/read` | 특정 알림 읽음 처리 |
| PATCH | `/api/notifications/read-all` | 모든 알림 읽음 처리 |

### 이메일 API

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/email/send` | 이메일 발송 |

---

## 🎨 UI 컴포넌트

### NotificationBell
```typescript
import { NotificationBell } from '@/components/notifications/NotificationBell'

<NotificationBell />
```

**특징:**
- 읽지 않은 알림 개수 배지
- 최근 5개 알림 드롭다운
- 30초마다 자동 폴링
- "모두 보기" 링크

### NotificationList
```typescript
import { NotificationList } from '@/components/notifications/NotificationList'

<NotificationList
  notifications={notifications}
  onNotificationRead={(id) => console.log('읽음:', id)}
/>
```

**특징:**
- 알림 유형별 아이콘
- 상대적 시간 표시
- 클릭 시 읽음 처리 및 네비게이션

---

## 🔒 보안 체크리스트

- [ ] RESEND_API_KEY 환경 변수 설정
- [ ] 발신 이메일 주소 검증
- [ ] 사용자 인증 확인 구현
- [ ] RLS 정책 설정 (Supabase)
- [ ] 알림 소유권 확인 (자신의 알림만 조회)
- [ ] 속도 제한 설정 (프로덕션)

---

## 🐛 문제 해결

### 이메일이 발송되지 않음
```bash
# 확인사항:
1. RESEND_API_KEY가 설정되어 있는가?
2. 발신자 이메일이 검증되었는가?
3. Resend 대시보드에서 API 호출 확인
```

### 알림이 표시되지 않음
```bash
# 확인사항:
1. 브라우저 콘솔에서 에러 확인
2. Supabase 인증 확인
3. user_id가 올바르게 저장되었는가?
4. RLS 정책 확인
```

### 설정이 저장되지 않음
```bash
# 확인사항:
1. localStorage가 활성화되었는가?
2. Supabase 연결 상태
3. 프로필 업데이트 권한
```

---

## 📚 추가 자료

- 전체 가이드: [NOTIFICATION_EMAIL_SETTINGS_GUIDE.md](./NOTIFICATION_EMAIL_SETTINGS_GUIDE.md)
- Resend 문서: https://resend.com/docs
- Supabase 문서: https://supabase.com/docs
- Next.js 14 문서: https://nextjs.org/docs

---

## 📞 지원

문제가 발생하면:
1. 콘솔 로그 확인
2. 네트워크 탭에서 API 호출 확인
3. Supabase 대시보드에서 데이터 확인
4. Resend 대시보드에서 이메일 로그 확인
