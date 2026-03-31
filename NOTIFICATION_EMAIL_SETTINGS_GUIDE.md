# EduTrack: 알림, 이메일, 설정 시스템 가이드

## 개요

이 문서는 EduTrack에 새로 추가된 알림 시스템, 이메일 API, 그리고 설정 페이지를 설명합니다.

---

## 1. 알림 시스템 (Notification System)

### 1.1 데이터베이스 테이블
- **테이블**: `notifications`
- **필드**: `id`, `user_id`, `title`, `message`, `type` (info|success|warning|error), `read`, `action_url`, `created_at`

### 1.2 API 엔드포인트

#### GET /api/notifications
사용자의 알림 목록을 조회합니다.

**쿼리 파라미터:**
- `unread_only` (boolean): true일 경우 읽지 않은 알림만 반환

**응답 예시:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "상담 일정 알림",
    "message": "내일 오후 2시 상담이 예정되어 있습니다.",
    "type": "info",
    "read": false,
    "action_url": "/dashboard/consultations/123",
    "created_at": "2026-03-30T10:00:00Z"
  }
]
```

#### POST /api/notifications
새로운 알림을 생성합니다.

**요청 본문:**
```json
{
  "title": "알림 제목",
  "message": "알림 메시지",
  "type": "info",
  "action_url": "/dashboard/consultations/123"
}
```

#### PATCH /api/notifications/[id]/read
특정 알림을 읽음으로 표시합니다.

#### PATCH /api/notifications/read-all
모든 읽지 않은 알림을 읽음으로 표시합니다.

### 1.3 컴포넌트

#### NotificationBell (`src/components/notifications/NotificationBell.tsx`)
- 네비게이션 바에 표시되는 종 아이콘
- 읽지 않은 알림 개수 배지
- 최근 5개 알림을 드롭다운으로 표시
- 30초마다 자동으로 알림을 폴링

**사용 예시:**
```tsx
import { NotificationBell } from '@/components/notifications/NotificationBell'

export function Header() {
  return (
    <nav>
      {/* ... 다른 항목들 ... */}
      <NotificationBell />
    </nav>
  )
}
```

#### NotificationList (`src/components/notifications/NotificationList.tsx`)
- 알림 항목 목록 표시
- 알림 유형별 아이콘 및 색상
- 상대적 시간 표시 (방금 전, 5분 전, 등)
- 클릭 시 읽음으로 표시 및 네비게이션

**props:**
- `notifications`: 알림 배열
- `onNotificationRead`: 알림이 읽힐 때 호출되는 콜백

### 1.4 알림 페이지
**경로**: `/dashboard/notifications`

**기능:**
- 전체 알림 목록 조회
- 필터링: "전체" / "읽지않음"
- "모두 읽음으로 표시" 버튼
- 각 알림에서 읽지 않은 알림 개수 표시

---

## 2. 이메일 API (Email System)

### 2.1 Resend 설정

**필수 환경 변수:**
```env
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@edutrack.com
```

### 2.2 이메일 템플릿 (`src/lib/email/templates.ts`)

#### 1) 상담 일정 알림 (consultationReminderEmail)
- **목적**: 예정된 상담 시간 전에 학생에게 알림
- **파라미터**: `studentName`, `teacherName`, `date`

```typescript
import { consultationReminderEmail } from '@/lib/email/templates'

const html = consultationReminderEmail('김학생', '이선생', '2026-04-01T14:00:00')
```

#### 2) 등록금 납부 안내 (paymentDueEmail)
- **목적**: 등록금 납부 기한이 다가올 때
- **파라미터**: `studentName`, `amount`, `dueDate`

```typescript
import { paymentDueEmail } from '@/lib/email/templates'

const html = paymentDueEmail('김학생', 500000, '2026-04-05')
```

#### 3) 새로운 상담 등록 (newConsultationEmail)
- **목적**: 새로운 상담이 등록되었을 때
- **파라미터**: `studentName`, `teacherName`, `type` (academic|career|university|general)

```typescript
import { newConsultationEmail } from '@/lib/email/templates'

const html = newConsultationEmail('김학생', '이선생', 'academic')
```

#### 4) 입시 진행 상황 업데이트 (applicationUpdateEmail)
- **목적**: 대학 입시 진행 상황이 변경될 때
- **파라미터**: `studentName`, `university`, `status` (draft|submitted|accepted|rejected|waitlisted)

```typescript
import { applicationUpdateEmail } from '@/lib/email/templates'

const html = applicationUpdateEmail('김학생', '서울대학교', 'accepted')
```

### 2.3 이메일 전송 API

**엔드포인트**: `POST /api/email/send`

**요청 본문:**
```json
{
  "to": "student@example.com",
  "subject": "상담 일정 알림",
  "template": "consultation_reminder",
  "data": {
    "studentName": "김학생",
    "teacherName": "이선생",
    "date": "2026-04-01T14:00:00"
  }
}
```

**응답:**
```json
{
  "success": true,
  "id": "email-id-from-resend"
}
```

**에러 응답:**
```json
{
  "error": "이메일을 발송하는 중 오류가 발생했습니다."
}
```

### 2.4 사용 예시

```typescript
// 상담 일정 알림 이메일 전송
async function sendConsultationReminder(
  studentEmail: string,
  studentName: string,
  teacherName: string,
  consultationDate: string
) {
  const response = await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: studentEmail,
      subject: '상담 일정 알림',
      template: 'consultation_reminder',
      data: {
        studentName,
        teacherName,
        date: consultationDate
      }
    })
  })

  if (response.ok) {
    const result = await response.json()
    console.log('이메일 발송 성공:', result.id)
  }
}
```

---

## 3. 설정 페이지 (Settings Page)

### 3.1 경로 및 접근
**경로**: `/dashboard/settings`
**접근**: 로그인한 모든 사용자

### 3.2 기능

#### 3.2.1 프로필 섹션
- **이름**: 편집 가능
- **휴대폰**: 편집 가능
- **이메일**: 읽기 전용 (변경 불가)
- **역할**: 읽기 전용

#### 3.2.2 비밀번호 변경
- 현재 비밀번호 입력 (선택사항)
- 새 비밀번호 입력
- 비밀번호 확인
- 검증: 두 비밀번호가 일치해야 함

#### 3.2.3 알림 설정
사용자가 각 알림 유형에 대해 on/off로 설정할 수 있습니다. 설정은 `localStorage`에 저장됩니다.

**알림 유형:**
- **consultation_reminder**: 상담 일정 알림 (기본값: true)
- **payment_due**: 등록금 납부 안내 (기본값: true)
- **new_consultation**: 새로운 상담 등록 (기본값: true)
- **application_update**: 입시 진행 상황 업데이트 (기본값: true)

#### 3.2.4 관리자 전용 섹션 (admin, manager only)
- **강사 관리**: `/dashboard/admin/teachers` 링크
- **학부모 관리**: `/dashboard/admin/parents` 링크

### 3.3 컴포넌트 상태 관리

```typescript
// 프로필 폼 상태
const [formData, setFormData] = useState({
  name: '',
  phone: '',
})

// 비밀번호 폼 상태
const [passwordForm, setPasswordForm] = useState({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// 알림 설정 상태
const [notificationPrefs, setNotificationPrefs] = useState({
  consultation_reminder: true,
  payment_due: true,
  new_consultation: true,
  application_update: true,
})
```

---

## 4. 통합 예시

### 4.1 상담 생성 시 알림 및 이메일 발송

```typescript
// 상담 생성
const { data: consultation } = await supabase
  .from('consultations')
  .insert({
    student_id: studentId,
    teacher_id: teacherId,
    consultation_date: date,
    topics: ['수학', '영어'],
  })
  .select()

// 알림 생성
await fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '새로운 상담이 등록되었습니다',
    message: `${teacherName} 선생님과의 상담이 ${formattedDate}에 예정되어 있습니다.`,
    type: 'info',
    action_url: `/dashboard/consultations/${consultation.id}`
  })
})

// 이메일 발송
await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: studentEmail,
    subject: '새로운 상담이 등록되었습니다',
    template: 'new_consultation',
    data: {
      studentName,
      teacherName,
      type: 'academic'
    }
  })
})
```

### 4.2 등록금 납부 기한 이메일 발송 (예정된 작업)

```typescript
// 매달 1일에 실행되는 예정된 작업
async function sendPaymentReminders() {
  const supabase = await createClient()

  // 7일 이내 납부 기한이 있는 학생 조회
  const { data: payments } = await supabase
    .from('payments')
    .select('*, student:students(profile:profiles(email, name))')
    .eq('status', 'pending')
    .gte('due_date', new Date().toISOString())
    .lte('due_date', addDays(new Date(), 7).toISOString())

  // 각 학생에게 이메일 발송
  for (const payment of payments || []) {
    await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: payment.student.profile.email,
        subject: '등록금 납부 안내',
        template: 'payment_due',
        data: {
          studentName: payment.student.profile.name,
          amount: payment.amount,
          dueDate: payment.due_date
        }
      })
    })
  }
}
```

---

## 5. 파일 구조 요약

```
src/
├── app/
│   ├── api/
│   │   ├── email/
│   │   │   └── send/
│   │   │       └── route.ts          # 이메일 발송 API
│   │   └── notifications/
│   │       ├── route.ts              # GET/POST 알림
│   │       ├── [id]/
│   │       │   └── read/
│   │       │       └── route.ts      # PATCH 특정 알림 읽음
│   │       └── read-all/
│   │           └── route.ts          # PATCH 모든 알림 읽음
│   └── dashboard/
│       ├── notifications/
│       │   └── page.tsx              # 알림 페이지
│       └── settings/
│           └── page.tsx              # 설정 페이지
├── components/
│   ├── notifications/
│   │   ├── NotificationBell.tsx       # 알림 벨 컴포넌트
│   │   └── NotificationList.tsx       # 알림 목록 컴포넌트
│   └── ui/
│       └── Label.tsx                  # 라벨 UI 컴포넌트
└── lib/
    ├── auth.ts                        # 인증 유틸리티
    ├── email/
    │   └── templates.ts               # 이메일 템플릿
    └── supabase/
        └── client.ts                  # Supabase 클라이언트
```

---

## 6. 환경 변수 설정

필수 환경 변수:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Resend
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@edutrack.com
```

---

## 7. 보안 고려사항

1. **인증 확인**: 모든 API 엔드포인트는 현재 사용자 인증을 확인합니다
2. **데이터 소유권**: 사용자는 자신의 알림만 조회/수정할 수 있습니다
3. **이메일 검증**: Resend를 통해 신뢰할 수 있는 이메일 발송
4. **속도 제한**: 프로덕션 환경에서는 API 속도 제한 추가 권장

---

## 8. 확장 가능성

### 알림 유형 추가
`src/lib/email/templates.ts`에서 새로운 함수를 추가하고, `/api/email/send`의 `template` switch 문에 케이스를 추가하면 됩니다.

### 알림 카테고리 추가
`notifications` 테이블에 `category` 필드를 추가하고, 필터링 로직을 확장합니다.

### 실시간 알림
Supabase의 Realtime 기능을 사용하여 WebSocket 기반 실시간 알림 구현 가능:

```typescript
supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // 새 알림 처리
    }
  )
  .subscribe()
```

---

## 9. 문제 해결

### 이메일이 발송되지 않는 경우
1. RESEND_API_KEY가 올바르게 설정되었는지 확인
2. Resend 대시보드에서 API 키의 유효성 확인
3. 발신자 이메일 주소가 Resend에서 검증되었는지 확인

### 알림이 표시되지 않는 경우
1. 브라우저 콘솔에서 에러 확인
2. Supabase RLS 정책이 올바르게 설정되었는지 확인
3. 사용자의 user_id가 정확히 저장되었는지 확인

### 설정이 저장되지 않는 경우
1. localStorage가 활성화되어 있는지 확인
2. 브라우저 개발자 도구의 Application 탭에서 localStorage 확인
3. 프로필 업데이트 시 Supabase 연결 확인
