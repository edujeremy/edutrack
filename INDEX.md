# EduTrack 알림·이메일·설정 시스템 파일 인덱스

## 목차

1. [빠른 참조](#빠른-참조)
2. [전체 파일 목록](#전체-파일-목록)
3. [문서 가이드](#문서-가이드)
4. [실행 체크리스트](#실행-체크리스트)

---

## 빠른 참조

### 알림 생성하기
```typescript
import { notifyConsultationReminder } from '@/lib/notifications'

await notifyConsultationReminder(
  userId,
  '김학생',
  '이선생',
  '2026-04-01T14:00:00',
  'consultation-123'
)
```

### 이메일 발송하기
```typescript
import { sendConsultationReminderEmail } from '@/lib/email/send'

await sendConsultationReminderEmail(
  'student@example.com',
  '김학생',
  '이선생',
  '2026-04-01T14:00:00'
)
```

### UI에 알림 벨 추가하기
```typescript
import { NotificationBell } from '@/components/notifications/NotificationBell'

<NotificationBell />
```

---

## 전체 파일 목록

### API 라우트 (4개)

| 파일 | 경로 | 기능 |
|------|------|------|
| route.ts | `/api/notifications` | GET: 알림 조회, POST: 알림 생성 |
| [id]/read/route.ts | `/api/notifications/[id]/read` | PATCH: 특정 알림 읽음 |
| read-all/route.ts | `/api/notifications/read-all` | PATCH: 모든 알림 읽음 |
| send/route.ts | `/api/email/send` | POST: 이메일 발송 |

**경로**: `src/app/api/`

### 페이지 (2개)

| 파일 | URL | 기능 |
|------|-----|------|
| notifications/page.tsx | `/dashboard/notifications` | 알림 목록 페이지 |
| settings/page.tsx | `/dashboard/settings` | 설정 페이지 |

**경로**: `src/app/dashboard/`

### 컴포넌트 (2개)

| 파일 | 타입 | 기능 |
|------|------|------|
| NotificationBell.tsx | Client | 알림 벨 아이콘 + 드롭다운 |
| NotificationList.tsx | Client | 알림 목록 렌더링 |

**경로**: `src/components/notifications/`

### 라이브러리 (5개)

| 파일 | 기능 | 함수 수 |
|------|------|--------|
| auth.ts | 인증 유틸 | 2개 |
| notifications.ts | 알림 헬퍼 | 8개 |
| email/templates.ts | 이메일 템플릿 | 4개 |
| email/send.ts | 이메일 전송 헬퍼 | 5개 |
| supabase/client.ts | Supabase 클라이언트 | 1개 |

**경로**: `src/lib/`

### UI 컴포넌트 (1개)

| 파일 | 용도 |
|------|------|
| Label.tsx | 폼 라벨 |

**경로**: `src/components/ui/`

---

## 문서 가이드

### 1. QUICK_START.md (신입 개발자용)
**시간**: 5분
**내용**:
- 환경 설정
- 자주 사용되는 코드 스니펫
- 실제 활용 사례
- API 요약표
- 체크리스트

**언제 읽을까**:
- 빨리 시작하고 싶을 때
- 자주 사용되는 패턴이 필요할 때
- 일반적인 사용 사례를 보고 싶을 때

### 2. NOTIFICATION_EMAIL_SETTINGS_GUIDE.md (전체 설명서)
**시간**: 30분
**내용**:
- 완전한 API 문서
- 컴포넌트 상세 설명
- 데이터베이스 구조
- 통합 예시
- 보안 고려사항
- 문제 해결
- 확장 방법

**언제 읽을까**:
- 시스템을 깊이 이해하고 싶을 때
- API 엔드포인트 세부 사항을 알아야 할 때
- 보안 설정을 확인하고 싶을 때
- 새로운 기능을 추가하고 싶을 때

### 3. IMPLEMENTATION_SUMMARY.md (프로젝트 개요)
**시간**: 10분
**내용**:
- 구현 완료 항목
- 시스템 아키텍처
- 기술 스택
- 성능 최적화
- 배포 준비
- 다음 단계

**언제 읽을까**:
- 프로젝트 전체 현황을 파악하고 싶을 때
- 팀에 설명할 때
- 배포 준비를 할 때
- 기술 스택을 확인하고 싶을 때

---

## 실행 체크리스트

### 초기 설정
- [ ] Resend 계정 가입 (https://resend.com)
- [ ] API 키 발급
- [ ] 발신자 이메일 검증
- [ ] `.env.local` 파일에 환경 변수 설정
  ```env
  RESEND_API_KEY=re_xxxxx
  RESEND_FROM_EMAIL=noreply@edutrack.com
  ```

### 기능 테스트
- [ ] 알림 API 테스트
  ```bash
  curl http://localhost:3000/api/notifications
  ```
- [ ] 이메일 발송 테스트
  ```bash
  curl -X POST http://localhost:3000/api/email/send \
    -H "Content-Type: application/json" \
    -d '{"to":"test@example.com",...}'
  ```
- [ ] 알림 페이지 접속 (`/dashboard/notifications`)
- [ ] 설정 페이지 접속 (`/dashboard/settings`)
- [ ] NotificationBell 컴포넌트 표시 확인

### 배포 전 점검
- [ ] 모든 환경 변수 설정 확인
- [ ] Resend 라이브 모드 활성화
- [ ] Supabase 프로덕션 데이터베이스 확인
- [ ] CORS 설정 확인
- [ ] SSL/HTTPS 활성화
- [ ] 에러 로깅 설정
- [ ] 모니터링 설정 (Sentry 등)

### 운영 체크리스트
- [ ] 알림 발송 로그 모니터링
- [ ] 이메일 발송 성공률 모니터링
- [ ] Resend 대시보드에서 이메일 추적
- [ ] 사용자 피드백 수집
- [ ] 성능 메트릭 분석

---

## 개발 가이드

### 새로운 알림 유형 추가

1. **알림 헬퍼 함수 추가** (`src/lib/notifications.ts`):
```typescript
export async function notifyMyNewType(
  userId: string,
  data: any
) {
  return createNotification(userId, {
    title: '알림 제목',
    message: '알림 메시지',
    type: 'info',
    action_url: '/dashboard/mypage'
  })
}
```

2. **이메일 템플릿 추가** (`src/lib/email/templates.ts`):
```typescript
export function myNewTypeEmail(name: string): string {
  return `<html>...</html>`
}
```

3. **이메일 발송 헬퍼 추가** (`src/lib/email/send.ts`):
```typescript
export async function sendMyNewTypeEmail(email: string, data: any) {
  return sendEmail({
    to: email,
    subject: '제목',
    template: 'my_new_type',
    data
  })
}
```

4. **API에 템플릿 추가** (`src/app/api/email/send/route.ts`):
```typescript
case 'my_new_type':
  html = myNewTypeEmail(data.name)
  break
```

---

## 성능 팁

### 알림 조회 최적화
```typescript
// Good - 필터링 포함
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .eq('read', false)
  .limit(10)

// Bad - 모든 알림 조회
const { data } = await supabase
  .from('notifications')
  .select('*')
```

### 이메일 배치 처리
```typescript
// Good - 배치로 처리
const users = await getUsers(1000)
await Promise.all(
  users.map(u => sendEmail(u))
)

// Bad - 순차 처리
for (const user of users) {
  await sendEmail(user) // 느림
}
```

---

## 보안 팁

### 민감한 정보 처리
- API 키는 환경 변수에만 저장
- 이메일에서 비밀번호 절대 전송 금지
- 사용자 ID 검증 필수

### 입력 검증
```typescript
// Good
if (!title || !message) {
  return error('필수 필드 누락')
}

// Bad - 검증 없음
const { title, message } = body
```

---

## 자주 묻는 질문

**Q: 이메일이 스팸 폴더로 가요**
A: Resend 발신자 이메일이 검증되었는지 확인하세요.

**Q: 알림이 표시되지 않아요**
A: 브라우저 콘솔의 에러를 확인하고, Supabase 연결 상태를 확인하세요.

**Q: 실시간 알림을 원해요**
A: Supabase Realtime을 사용하면 WebSocket 기반 실시간 업데이트를 구현할 수 있습니다.

**Q: SMS 알림도 보낼 수 있나요**
A: Twilio 같은 SMS 서비스와 통합하면 가능합니다.

---

## 지원 및 피드백

문제가 있으면:
1. NOTIFICATION_EMAIL_SETTINGS_GUIDE.md의 문제 해결 섹션 참조
2. 브라우저 콘솔 에러 확인
3. Supabase 대시보드 확인
4. Resend 대시보드에서 이메일 로그 확인

---

## 마지막 업데이트
- 날짜: 2026년 3월 30일
- 버전: 1.0.0
- 상태: 프로덕션 준비 완료

---

**행운을 빕니다! EduTrack 팀**
