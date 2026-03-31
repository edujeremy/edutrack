-- ============================================================================
-- EduTrack - 입시 컨설팅 학원 관리 시스템 (Korean College Admissions Academy Management)
-- Supabase Database Schema
-- ============================================================================

-- ============================================================================
-- 1. 커스텀 타입 / Enums (Custom Types)
-- ============================================================================

-- 사용자 역할 (User Roles)
CREATE TYPE user_role AS ENUM (
  'admin',      -- 관리자
  'teacher',    -- 선생님 (강사)
  'parent'      -- 학부모 (학생 보호자)
);

-- 학생 상태 (Student Status)
CREATE TYPE student_status AS ENUM (
  'active',     -- 활성 (현재 수강 중)
  'inactive',   -- 비활성 (수강 중단)
  'graduated',  -- 졸업 (입시 완료)
  'withdrawn'   -- 중단 (탈퇴)
);

-- 상담 유형 (Consultation Types)
CREATE TYPE consultation_type AS ENUM (
  'initial',           -- 초기 상담 (첫 만남)
  'regular',           -- 정기 상담 (주기적 상담)
  'urgent',            -- 긴급 상담 (급할 때)
  'college_strategy'   -- 대입 전략 (전략 수립)
);

-- 결제 상태 (Payment Status)
CREATE TYPE payment_status AS ENUM (
  'pending',   -- 대기 중 (미결제)
  'paid',      -- 완료 (결제됨)
  'overdue',   -- 연체 (기한 지남)
  'refunded'   -- 환불 (환불됨)
);

-- 지원 상태 (Application Status)
CREATE TYPE application_status AS ENUM (
  'preparing',   -- 준비 중
  'submitted',   -- 제출 완료
  'accepted',    -- 합격
  'rejected',    -- 불합격
  'waitlisted'   -- 대기 (예비)
);

-- ============================================================================
-- 2. 테이블 생성 (Tables)
-- ============================================================================

-- ============================================================================
-- 2.1 프로필 테이블 (Profiles - Extends auth.users)
-- ============================================================================
CREATE TABLE profiles (
  -- ID는 Supabase auth.users의 ID와 연결
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 기본 정보 (Basic Information)
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'parent',
  phone TEXT,
  avatar_url TEXT,

  -- 선생님 정보 (Teacher-specific info)
  bio TEXT,
  specialization TEXT, -- 전문 분야 (e.g., "입시 전략", "면접 준비")

  -- 타임스탬프 (Timestamps)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 제약 조건 (Constraints)
  CONSTRAINT role_must_be_valid CHECK (role IN ('admin', 'teacher', 'parent'))
);

-- ============================================================================
-- 2.2 학생 테이블 (Students)
-- ============================================================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보 (Basic Information)
  name TEXT NOT NULL,
  school TEXT NOT NULL, -- 현재 다니는 학교
  grade INTEGER NOT NULL, -- 학년 (1, 2, 3)
  phone TEXT,

  -- 대학 지원 정보 (College Application Info)
  target_universities TEXT[], -- 목표 대학 목록 (배열)
  gpa DECIMAL(3, 2), -- 학점 (GPA 또는 내신)

  -- 관계 정보 (Relationships)
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- 학부모
  assigned_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- 담당 선생님

  -- 상태 (Status)
  status student_status NOT NULL DEFAULT 'active',

  -- 추가 정보 (Additional Info)
  notes TEXT, -- 특이사항 (메모)

  -- 타임스탬프 (Timestamps)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 제약 조건 (Constraints)
  CONSTRAINT grade_valid CHECK (grade >= 1 AND grade <= 3),
  CONSTRAINT gpa_valid CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 4.5))
);

-- ============================================================================
-- 2.3 상담 기록 테이블 (Consultations)
-- ============================================================================
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관계 정보 (Relationships)
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- 상담 내용 (Consultation Details)
  type consultation_type NOT NULL DEFAULT 'regular',
  title TEXT NOT NULL,
  content TEXT, -- 상담 내용 (상세 설명)
  next_steps TEXT, -- 다음 단계 (Follow-up 계획)

  -- 시간 정보 (Timing)
  scheduled_at TIMESTAMP WITH TIME ZONE, -- 상담 예정 시간
  completed_at TIMESTAMP WITH TIME ZONE, -- 상담 완료 시간

  -- 타임스탬프 (Timestamps)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2.4 지원 현황 테이블 (University Applications)
-- ============================================================================
CREATE TABLE university_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관계 정보 (Relationships)
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- 지원 정보 (Application Details)
  university_name TEXT NOT NULL, -- 대학명
  major TEXT NOT NULL, -- 전공
  application_type TEXT NOT NULL, -- '수시' (Early Decision) 또는 '정시' (Regular)

  -- 상태 (Status)
  status application_status NOT NULL DEFAULT 'preparing',

  -- 일정 (Schedule)
  deadline DATE, -- 지원 마감일

  -- 추가 정보 (Additional Info)
  notes TEXT,

  -- 타임스탬프 (Timestamps)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 제약 조건 (Constraints)
  CONSTRAINT valid_application_type CHECK (application_type IN ('수시', '정시'))
);

-- ============================================================================
-- 2.5 수업 일정 테이블 (Schedules)
-- ============================================================================
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관계 정보 (Relationships)
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,

  -- 일정 정보 (Schedule Details)
  title TEXT NOT NULL,
  description TEXT,

  -- 시간 (Time)
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,

  -- 반복 설정 (Recurrence)
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule TEXT, -- iCal RRULE 형식 (e.g., 'FREQ=WEEKLY;BYDAY=MO,WE,FR')

  -- 타임스탬프 (Timestamps)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- 제약 조건 (Constraints)
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- ============================================================================
-- 2.6 결제 테이블 (Payments)
-- ============================================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관계 정보 (Relationships)
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- 결제 정보 (Payment Details)
  amount DECIMAL(10, 2) NOT NULL, -- 금액
  description TEXT NOT NULL, -- 설명 (e.g., "2026년 3월 수업료")

  -- 날짜 (Dates)
  payment_date DATE, -- 실제 결제일
  due_date DATE NOT NULL, -- 납기일

  -- 상태 (Status)
  status payment_status NOT NULL DEFAULT 'pending',

  -- 영수증 (Receipt)
  receipt_url TEXT, -- 영수증 URL

  -- 타임스탬프 (Timestamps)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 제약 조건 (Constraints)
  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- ============================================================================
-- 2.7 알림 테이블 (Notifications)
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관계 정보 (Relationships)
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- 알림 내용 (Notification Content)
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- 상태 (Status)
  is_read BOOLEAN NOT NULL DEFAULT FALSE,

  -- 링크 (Navigation)
  link TEXT, -- 클릭 시 이동할 URL (e.g., '/students/123')

  -- 타임스탬프 (Timestamps)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 인덱스 (Indexes - will add below)
  INDEX idx_notifications_user_is_read (user_id, is_read)
);

-- ============================================================================
-- 3. 인덱스 (Indexes for Performance)
-- ============================================================================

-- 프로필
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- 학생
CREATE INDEX idx_students_parent_id ON students(parent_id);
CREATE INDEX idx_students_assigned_teacher_id ON students(assigned_teacher_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_school ON students(school);

-- 상담 기록
CREATE INDEX idx_consultations_student_id ON consultations(student_id);
CREATE INDEX idx_consultations_teacher_id ON consultations(teacher_id);
CREATE INDEX idx_consultations_scheduled_at ON consultations(scheduled_at);
CREATE INDEX idx_consultations_type ON consultations(type);

-- 지원 현황
CREATE INDEX idx_university_applications_student_id ON university_applications(student_id);
CREATE INDEX idx_university_applications_status ON university_applications(status);
CREATE INDEX idx_university_applications_deadline ON university_applications(deadline);

-- 수업 일정
CREATE INDEX idx_schedules_student_id ON schedules(student_id);
CREATE INDEX idx_schedules_teacher_id ON schedules(teacher_id);
CREATE INDEX idx_schedules_start_time ON schedules(start_time);

-- 결제
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);

-- 알림
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================================================
-- 4. 트리거 (Triggers)
-- ============================================================================

-- ============================================================================
-- 4.1 자동 updated_at 업데이트 함수
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 프로필 updated_at 트리거
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 학생 updated_at 트리거
CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 대학 지원 현황 updated_at 트리거
CREATE TRIGGER update_university_applications_updated_at
BEFORE UPDATE ON university_applications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 결제 updated_at 트리거
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4.2 새 사용자 등록 시 자동으로 프로필 생성
-- ============================================================================
CREATE OR REPLACE FUNCTION create_profile_on_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.user_metadata->>'full_name', NEW.email),
    COALESCE((NEW.user_metadata->>'role')::user_role, 'parent'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- auth.users 삽입 시 프로필 자동 생성
CREATE TRIGGER create_profile_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_profile_on_user_signup();

-- ============================================================================
-- 4.3 상담 생성 시 자동으로 알림 생성
-- ============================================================================
CREATE OR REPLACE FUNCTION create_notification_on_consultation()
RETURNS TRIGGER AS $$
BEGIN
  -- 담당 선생님에게 알림 (상담 기록 생성 시 선생님에게 알림)
  INSERT INTO notifications (user_id, title, message, link)
  VALUES (
    NEW.teacher_id,
    '새로운 상담 일정',
    '새로운 상담이 예약되었습니다.',
    '/consultations/' || NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 상담 생성 시 알림 생성
CREATE TRIGGER create_notification_on_consultation_trigger
AFTER INSERT ON consultations
FOR EACH ROW
EXECUTE FUNCTION create_notification_on_consultation();

-- ============================================================================
-- 4.4 결제 기한이 다가올 때 자동으로 알림 생성
-- ============================================================================
CREATE OR REPLACE FUNCTION create_notification_on_payment_due()
RETURNS TRIGGER AS $$
DECLARE
  parent_id UUID;
BEGIN
  -- 학생의 부모를 찾기
  SELECT s.parent_id INTO parent_id
  FROM students s
  WHERE s.id = NEW.student_id;

  -- 결제 상태가 대기 중이고 3일 이내에 기한이 도래하면 알림
  IF NEW.status = 'pending'::payment_status
    AND NEW.due_date IS NOT NULL
    AND NEW.due_date <= CURRENT_DATE + INTERVAL '3 days'
  THEN
    INSERT INTO notifications (user_id, title, message, link)
    VALUES (
      parent_id,
      '결제 기한 안내',
      '수업료 결제 기한이 다가오고 있습니다.',
      '/payments/' || NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 결제 생성 시 알림
CREATE TRIGGER create_notification_on_payment_trigger
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION create_notification_on_payment_due();

-- ============================================================================
-- 5. Row Level Security (RLS) - 행 단위 보안
-- ============================================================================

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5.1 Profiles 정책
-- ============================================================================

-- Admin: 모든 프로필 조회 및 수정 가능
CREATE POLICY admin_profiles_all
ON profiles FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- 사용자: 자신의 프로필만 조회 가능
CREATE POLICY user_own_profile_read
ON profiles FOR SELECT
USING (auth.uid() = id);

-- 사용자: 자신의 프로필만 수정 가능
CREATE POLICY user_own_profile_update
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- ============================================================================
-- 5.2 Students 정책
-- ============================================================================

-- Admin: 모든 학생 데이터 접근 가능
CREATE POLICY admin_students_all
ON students FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Parent: 자신의 자녀 데이터만 조회 가능 (읽기 전용)
CREATE POLICY parent_own_students_read
ON students FOR SELECT
USING (parent_id = auth.uid());

-- Teacher: 자신에게 배정된 학생 데이터만 조회 가능
CREATE POLICY teacher_assigned_students_read
ON students FOR SELECT
USING (assigned_teacher_id = auth.uid());

-- Teacher: 자신에게 배정된 학생 데이터 수정 가능
CREATE POLICY teacher_assigned_students_update
ON students FOR UPDATE
USING (assigned_teacher_id = auth.uid());

-- ============================================================================
-- 5.3 Consultations 정책
-- ============================================================================

-- Admin: 모든 상담 기록 접근 가능
CREATE POLICY admin_consultations_all
ON consultations FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Teacher: 자신이 진행한 상담 기록 조회 및 수정 가능
CREATE POLICY teacher_own_consultations
ON consultations FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY teacher_own_consultations_update
ON consultations FOR UPDATE
USING (teacher_id = auth.uid());

-- Parent: 자신의 자녀 상담 기록 조회 가능 (읽기 전용)
CREATE POLICY parent_own_student_consultations
ON consultations FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE parent_id = auth.uid()
  )
);

-- ============================================================================
-- 5.4 University Applications 정책
-- ============================================================================

-- Admin: 모든 지원 현황 접근 가능
CREATE POLICY admin_applications_all
ON university_applications FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Teacher: 자신에게 배정된 학생의 지원 현황 조회 및 수정 가능
CREATE POLICY teacher_assigned_applications
ON university_applications FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE assigned_teacher_id = auth.uid()
  )
);

CREATE POLICY teacher_assigned_applications_update
ON university_applications FOR UPDATE
USING (
  student_id IN (
    SELECT id FROM students WHERE assigned_teacher_id = auth.uid()
  )
);

-- Parent: 자신의 자녀 지원 현황 조회 가능 (읽기 전용)
CREATE POLICY parent_own_applications
ON university_applications FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE parent_id = auth.uid()
  )
);

-- ============================================================================
-- 5.5 Schedules 정책
-- ============================================================================

-- Admin: 모든 일정 접근 가능
CREATE POLICY admin_schedules_all
ON schedules FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Teacher: 자신이 담당하는 일정 조회 및 수정 가능
CREATE POLICY teacher_own_schedules
ON schedules FOR SELECT
USING (teacher_id = auth.uid());

CREATE POLICY teacher_own_schedules_update
ON schedules FOR UPDATE
USING (teacher_id = auth.uid());

-- Parent: 자신의 자녀 일정 조회 가능 (읽기 전용)
CREATE POLICY parent_own_student_schedules
ON schedules FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE parent_id = auth.uid()
  )
);

-- ============================================================================
-- 5.6 Payments 정책
-- ============================================================================

-- Admin: 모든 결제 정보 접근 가능
CREATE POLICY admin_payments_all
ON payments FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Parent: 자신의 자녀 결제 정보 조회 가능 (읽기 전용)
CREATE POLICY parent_own_payments
ON payments FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE parent_id = auth.uid()
  )
);

-- Teacher: 자신이 담당하는 학생의 결제 정보 조회 가능 (읽기 전용)
CREATE POLICY teacher_assigned_payments
ON payments FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE assigned_teacher_id = auth.uid()
  )
);

-- ============================================================================
-- 5.7 Notifications 정책
-- ============================================================================

-- 사용자: 자신의 알림만 조회 가능
CREATE POLICY user_own_notifications
ON notifications FOR SELECT
USING (user_id = auth.uid());

-- 사용자: 자신의 알림 수정 가능 (읽음 표시)
CREATE POLICY user_own_notifications_update
ON notifications FOR UPDATE
USING (user_id = auth.uid());

-- ============================================================================
-- 6. 샘플 데이터 (Sample Data - Commented Out)
-- ============================================================================

/*
-- ===== 주의: 실제 사용하기 전에 다음을 수행하세요 =====
-- 1. Supabase 인증 설정 완료
-- 2. 실제 사용자 ID로 교체
-- 3. 아래 주석 제거 후 실행

-- 샘플 학부모 프로필 생성
-- (실제로는 auth.users를 통해 생성되어야 함)
INSERT INTO profiles (id, email, full_name, role, phone, created_at, updated_at)
VALUES
  (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'parent1@example.com',
    '김영희',
    'parent',
    '010-1234-5678',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'parent2@example.com',
    '이민수',
    'parent',
    '010-9876-5432',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO NOTHING;

-- 샘플 선생님 프로필 생성
INSERT INTO profiles (id, email, full_name, role, phone, bio, specialization, created_at, updated_at)
VALUES
  (
    '550e8400-e29b-41d4-a716-446655440010'::uuid,
    'teacher1@example.com',
    '박준호',
    'teacher',
    '010-2222-3333',
    '10년 경력의 입시 컨설턴트',
    '입시 전략',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '550e8400-e29b-41d4-a716-446655440011'::uuid,
    'teacher2@example.com',
    '최소영',
    'teacher',
    '010-4444-5555',
    '7년 경력의 면접 전문가',
    '면접 준비',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO NOTHING;

-- 샘플 학생 생성
INSERT INTO students (name, school, grade, gpa, parent_id, assigned_teacher_id, status, notes, created_at, updated_at)
VALUES
  (
    '김준호',
    '서울 대학교 사대 부속 고등학교',
    3,
    3.8,
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440010'::uuid,
    'active',
    '수학, 과학 우수 / SKY 목표',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '이수진',
    '인천 상정 고등학교',
    2,
    3.5,
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    '550e8400-e29b-41d4-a716-446655440011'::uuid,
    'active',
    '영어 우수 / 인문 계열 지원',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

-- 샘플 상담 기록 생성
INSERT INTO consultations (student_id, teacher_id, type, title, content, next_steps, scheduled_at, completed_at, created_at)
SELECT
  (SELECT id FROM students WHERE name = '김준호') AS student_id,
  '550e8400-e29b-41d4-a716-446655440010'::uuid AS teacher_id,
  'initial' AS type,
  '초기 상담 - 입시 목표 설정' AS title,
  'SKY 대학교 지원을 목표로 수능 전략 논의' AS content,
  '주간 정기 상담 시작 (월, 수, 금)' AS next_steps,
  CURRENT_TIMESTAMP + INTERVAL '3 days' AS scheduled_at,
  CURRENT_TIMESTAMP AS completed_at,
  CURRENT_TIMESTAMP AS created_at;

-- 샘플 대학 지원 현황 생성
INSERT INTO university_applications (student_id, university_name, major, application_type, status, deadline, notes, created_at, updated_at)
SELECT
  (SELECT id FROM students WHERE name = '김준호') AS student_id,
  '서울대학교' AS university_name,
  '컴퓨터공학' AS major,
  '수시' AS application_type,
  'preparing' AS status,
  '2026-09-15'::DATE AS deadline,
  '학생부 종합 전형 준비 중' AS notes,
  CURRENT_TIMESTAMP AS created_at,
  CURRENT_TIMESTAMP AS updated_at;

-- 샘플 수업 일정 생성
INSERT INTO schedules (student_id, teacher_id, title, description, start_time, end_time, is_recurring, recurrence_rule, created_at)
SELECT
  (SELECT id FROM students WHERE name = '김준호') AS student_id,
  '550e8400-e29b-41d4-a716-446655440010'::uuid AS teacher_id,
  '주간 정기 상담' AS title,
  '입시 전략 및 진로 상담' AS description,
  (CURRENT_DATE + INTERVAL '1 day 14:00:00')::TIMESTAMP WITH TIME ZONE AS start_time,
  (CURRENT_DATE + INTERVAL '1 day 15:00:00')::TIMESTAMP WITH TIME ZONE AS end_time,
  TRUE AS is_recurring,
  'FREQ=WEEKLY;BYDAY=MO,WE,FR' AS recurrence_rule,
  CURRENT_TIMESTAMP AS created_at;

-- 샘플 결제 생성
INSERT INTO payments (student_id, amount, description, payment_date, due_date, status, created_at, updated_at)
SELECT
  (SELECT id FROM students WHERE name = '김준호') AS student_id,
  500000 AS amount,
  '2026년 3월 수업료' AS description,
  NULL AS payment_date,
  (CURRENT_DATE + INTERVAL '7 days')::DATE AS due_date,
  'pending' AS status,
  CURRENT_TIMESTAMP AS created_at,
  CURRENT_TIMESTAMP AS updated_at;
*/

-- ============================================================================
-- 끝 (End of Schema)
-- ============================================================================
-- EduTrack 데이터베이스 스키마가 완성되었습니다.
-- 모든 테이블, 인덱스, 트리거, RLS 정책이 설정되었습니다.
-- Ready for use in Supabase!
