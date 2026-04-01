-- ============================================
-- EduTrack v2: 학원 관리 자동화 (코멘트 기반)
-- 핵심: 코멘트 제출 = 수업 인정 = 선생님 페이 횟차 +1
-- ============================================

-- 기존 테이블/타입 정리
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS university_applications CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS comment_status CASCADE;
DROP TYPE IF EXISTS attendance_status CASCADE;
DROP TYPE IF EXISTS absence_request_status CASCADE;
DROP TYPE IF EXISTS consultation_request_status CASCADE;
DROP TYPE IF EXISTS pay_settlement_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS student_status CASCADE;
DROP TYPE IF EXISTS package_status CASCADE;

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'parent');
CREATE TYPE comment_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
CREATE TYPE attendance_status AS ENUM ('scheduled', 'attended', 'absent', 'cancelled');
CREATE TYPE absence_request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE consultation_request_status AS ENUM ('pending', 'scheduled', 'completed', 'cancelled');
CREATE TYPE pay_settlement_status AS ENUM ('pending', 'paid', 'confirmed');
CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'overdue');
CREATE TYPE student_status AS ENUM ('active', 'inactive', 'graduated');
CREATE TYPE package_status AS ENUM ('active', 'completed', 'paused', 'cancelled');

-- ============================================
-- 1. PROFILES (유저 기본 정보)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'parent',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read profiles (for name lookups)
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
-- Admin can update any profile
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
-- Admin can insert profiles
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT WITH CHECK (
  auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- 2. STUDENTS (학생 정보 - 관리자가 등록)
-- ============================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school TEXT,
  grade INTEGER,
  parent_id UUID REFERENCES profiles(id),  -- 연결된 학부모 계정
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  status student_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_admin_all" ON students FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "students_teacher_select" ON students FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
);
CREATE POLICY "students_parent_select" ON students FOR SELECT USING (
  parent_id = auth.uid()
);

-- ============================================
-- 3. TEACHERS (선생님 추가 정보)
-- ============================================
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  per_session_rate INTEGER NOT NULL DEFAULT 0,  -- 회당 단가 (원 or 달러 센트)
  settlement_cycle INTEGER NOT NULL DEFAULT 4,  -- 정산 주기 (4회 or 8회마다)
  bank_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id)
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teachers_admin_all" ON teachers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "teachers_own_select" ON teachers FOR SELECT USING (
  profile_id = auth.uid()
);

-- ============================================
-- 4. PACKAGES (수강 패키지)
-- 수업이름, 학생, 선생님, 세션수, 수강료, 시작일, 요일(복수), 시간
-- ============================================
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- 수업 이름 (예: "수학 기초반")
  student_id UUID NOT NULL REFERENCES students(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  total_sessions INTEGER NOT NULL,         -- 총 세션 수 (예: 8회)
  completed_sessions INTEGER NOT NULL DEFAULT 0,
  tuition_amount INTEGER NOT NULL DEFAULT 0, -- 수강료
  tuition_status payment_status NOT NULL DEFAULT 'unpaid',
  schedule_days INTEGER[] NOT NULL,        -- 요일 배열 [1,3,5] = 월수금
  start_time TIME NOT NULL,                -- 기본 시작 시간
  end_time TIME NOT NULL,                  -- 기본 종료 시간
  start_date DATE NOT NULL,
  status package_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages_admin_all" ON packages FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "packages_teacher_select" ON packages FOR SELECT USING (
  EXISTS (SELECT 1 FROM teachers WHERE profile_id = auth.uid() AND id = packages.teacher_id)
);
CREATE POLICY "packages_parent_select" ON packages FOR SELECT USING (
  EXISTS (SELECT 1 FROM students WHERE parent_id = auth.uid() AND id = packages.student_id)
);

-- ============================================
-- 5. LESSONS (개별 수업 세션)
-- 패키지에서 자동 생성 또는 수동 추가
-- ============================================
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,         -- 회차 번호 (1, 2, 3...)
  lesson_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  attendance attendance_status NOT NULL DEFAULT 'scheduled',
  absence_reason TEXT,
  is_billable BOOLEAN NOT NULL DEFAULT true,  -- 청구 여부 (관리자 토글)
  is_teacher_payable BOOLEAN NOT NULL DEFAULT true, -- 페이 대상 여부
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_admin_all" ON lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "lessons_teacher_select" ON lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM packages p
    JOIN teachers t ON t.id = p.teacher_id
    WHERE p.id = lessons.package_id AND t.profile_id = auth.uid()
  )
);
CREATE POLICY "lessons_teacher_update" ON lessons FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM packages p
    JOIN teachers t ON t.id = p.teacher_id
    WHERE p.id = lessons.package_id AND t.profile_id = auth.uid()
  )
);
CREATE POLICY "lessons_parent_select" ON lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM packages p
    JOIN students s ON s.id = p.student_id
    WHERE p.id = lessons.package_id AND s.parent_id = auth.uid()
  )
);

-- ============================================
-- 6. COMMENTS (수업 코멘트 - 핵심 테이블!)
-- 선생님이 작성 → 관리자 승인 → 학부모 전송
-- ============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id),

  -- 구조화된 5개 필드
  progress TEXT NOT NULL DEFAULT '',       -- 오늘의 진도
  homework_evaluation TEXT NOT NULL DEFAULT '', -- 과제 평가
  strengths TEXT NOT NULL DEFAULT '',      -- 잘한 점
  improvements TEXT NOT NULL DEFAULT '',   -- 아쉬운 점
  homework TEXT NOT NULL DEFAULT '',       -- 다음 과제

  status comment_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  sent_to_parent_at TIMESTAMPTZ,          -- 학부모 전송 시각

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(lesson_id)  -- 수업당 코멘트 1개
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_admin_all" ON comments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "comments_teacher_own" ON comments FOR ALL USING (
  teacher_id = auth.uid()
);
CREATE POLICY "comments_parent_approved" ON comments FOR SELECT USING (
  status = 'approved' AND EXISTS (
    SELECT 1 FROM lessons l
    JOIN packages p ON p.id = l.package_id
    JOIN students s ON s.id = p.student_id
    WHERE l.id = comments.lesson_id AND s.parent_id = auth.uid()
  )
);

-- ============================================
-- 7. TEACHER_PAY_SETTLEMENTS (선생님 페이 정산)
-- ============================================
CREATE TABLE teacher_pay_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  session_count INTEGER NOT NULL,          -- 정산 대상 수업 수
  per_session_rate INTEGER NOT NULL,       -- 정산 당시 회당 단가
  total_amount INTEGER NOT NULL,           -- 총 지급액
  status pay_settlement_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,               -- 선생님 "받았습니다" 시각
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE teacher_pay_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay_admin_all" ON teacher_pay_settlements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "pay_teacher_own" ON teacher_pay_settlements FOR SELECT USING (
  EXISTS (SELECT 1 FROM teachers WHERE id = teacher_pay_settlements.teacher_id AND profile_id = auth.uid())
);
CREATE POLICY "pay_teacher_confirm" ON teacher_pay_settlements FOR UPDATE USING (
  EXISTS (SELECT 1 FROM teachers WHERE id = teacher_pay_settlements.teacher_id AND profile_id = auth.uid())
) WITH CHECK (status = 'confirmed');

-- ============================================
-- 8. ABSENCE_REQUESTS (학부모 결석 요청)
-- ============================================
CREATE TABLE absence_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  parent_id UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  status absence_request_status NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE absence_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "absence_admin_all" ON absence_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "absence_parent_own" ON absence_requests FOR ALL USING (
  parent_id = auth.uid()
);
CREATE POLICY "absence_teacher_select" ON absence_requests FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM lessons l
    JOIN packages p ON p.id = l.package_id
    JOIN teachers t ON t.id = p.teacher_id
    WHERE l.id = absence_requests.lesson_id AND t.profile_id = auth.uid()
  )
);

-- ============================================
-- 9. CONSULTATION_REQUESTS (상담 요청)
-- ============================================
CREATE TABLE consultation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id),
  student_id UUID NOT NULL REFERENCES students(id),
  subject TEXT NOT NULL,
  message TEXT,
  preferred_date DATE,
  preferred_time TIME,
  status consultation_request_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE consultation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consult_admin_all" ON consultation_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "consult_parent_own" ON consultation_requests FOR ALL USING (
  parent_id = auth.uid()
);

-- ============================================
-- 10. NOTIFICATIONS (알림)
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',  -- info, comment, absence, pay, billing
  read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (
  user_id = auth.uid()
);
CREATE POLICY "notifications_admin_insert" ON notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- 11. NOTIFICATION_SETTINGS (알림 설정)
-- ============================================
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_reminder BOOLEAN NOT NULL DEFAULT true,
  reminder_minutes INTEGER NOT NULL DEFAULT 30, -- 10/15/30/60분 전
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_settings_own" ON notification_settings FOR ALL USING (
  user_id = auth.uid()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_students_parent ON students(parent_id);
CREATE INDEX idx_teachers_profile ON teachers(profile_id);
CREATE INDEX idx_packages_student ON packages(student_id);
CREATE INDEX idx_packages_teacher ON packages(teacher_id);
CREATE INDEX idx_packages_status ON packages(status);
CREATE INDEX idx_lessons_package ON lessons(package_id);
CREATE INDEX idx_lessons_date ON lessons(lesson_date);
CREATE INDEX idx_lessons_attendance ON lessons(attendance);
CREATE INDEX idx_comments_lesson ON comments(lesson_id);
CREATE INDEX idx_comments_teacher ON comments(teacher_id);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_pay_teacher ON teacher_pay_settlements(teacher_id);
CREATE INDEX idx_absence_lesson ON absence_requests(lesson_id);
CREATE INDEX idx_consult_parent ON consultation_requests(parent_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_teachers_updated_at BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_packages_updated_at BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_pay_updated_at BEFORE UPDATE ON teacher_pay_settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'parent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if present
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- When comment is approved, update lesson attendance and package count
CREATE OR REPLACE FUNCTION on_comment_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Mark lesson as attended
    UPDATE lessons SET attendance = 'attended' WHERE id = NEW.lesson_id;

    -- Increment package completed_sessions
    UPDATE packages SET completed_sessions = completed_sessions + 1
    WHERE id = (SELECT package_id FROM lessons WHERE id = NEW.lesson_id);

    -- Record timestamps
    NEW.reviewed_at = now();
    NEW.sent_to_parent_at = now();
  END IF;

  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    NEW.submitted_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_comment_status_change BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION on_comment_approved();

-- When package completed_sessions reaches total, mark as completed
CREATE OR REPLACE FUNCTION on_package_session_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_sessions >= NEW.total_sessions AND NEW.status = 'active' THEN
    NEW.status = 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_package_auto_complete BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION on_package_session_complete();
