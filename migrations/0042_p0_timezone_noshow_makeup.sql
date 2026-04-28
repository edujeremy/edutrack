-- ============================================================
-- EduTrack P0 마이그레이션 — 2026-04-27
-- 1) profiles.timezone 추가 (4개 미국 타임존 CHECK)
-- 2) attendance_status enum 확장 (노쇼·통보결석·보강·스킵)
-- 3) lessons에 노쇼 승인 + 보강 워크플로우 컬럼 추가
-- 4) 학부모 lessons UPDATE RLS (보강 요청/스킵 액션용)
--
-- 시간대 정책:
--   - DB의 lesson_date / start_time / end_time 은 모두 America/Los_Angeles(PST/PDT) 기준으로 저장된다고 가정
--   - 사용자 화면 표시 시 profile.timezone 으로 변환
--
-- 실행 순서: 이 파일을 그대로 SQL Editor에 붙여 실행. ALTER TYPE ADD VALUE는
-- 다른 쿼리와 같은 트랜잭션에서 사용할 수 없어 한 줄씩 별도 실행됨 (Supabase는 자동 처리).
-- ============================================================

-- 1. profiles에 timezone 컬럼 추가 ----------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles';

-- CHECK 제약 추가 (이미 있으면 무시)
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_timezone_check
    CHECK (timezone IN (
      'America/Los_Angeles',  -- 서부 (Pacific)
      'America/Denver',       -- 마운틴
      'America/Chicago',      -- 중부
      'America/New_York'      -- 동부 (Eastern)
    ));
EXCEPTION WHEN duplicate_object THEN
  -- 이미 존재
  NULL;
END $$;

-- admin은 항상 캘리포니아 PST
UPDATE profiles SET timezone = 'America/Los_Angeles' WHERE role = 'admin';


-- 2. attendance_status enum 확장 ------------------------------
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'absent_notified';     -- 통보 결석 (사전 알림)
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'no_show';             -- 미통보 결석 (노쇼)
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'makeup_requested';    -- 보강 요청 (학부모→강사)
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'makeup_proposed';     -- 강사 슬롯 제안 (학부모 승인 대기)
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'makeup_scheduled';    -- 보강 일정 확정
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'makeup_done';         -- 보강 완료 (정상 출석화)
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'skipped';             -- 결석 후 스킵 (보강 안 함, 회차 차감 안 함)


-- 3. lessons에 노쇼 + 보강 컬럼 추가 -------------------------
ALTER TABLE lessons
  -- 노쇼 처리 (원장 승인)
  ADD COLUMN IF NOT EXISTS noshow_admin_approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS noshow_approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS noshow_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS noshow_note TEXT,

  -- 보강 워크플로우 (강사 제안 → 학부모 승인)
  ADD COLUMN IF NOT EXISTS makeup_proposed_date DATE,
  ADD COLUMN IF NOT EXISTS makeup_proposed_start TIME,
  ADD COLUMN IF NOT EXISTS makeup_proposed_end TIME,
  ADD COLUMN IF NOT EXISTS makeup_proposed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS makeup_proposed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS makeup_parent_approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS makeup_parent_approved_at TIMESTAMPTZ,

  -- 학부모 결석 후 액션 (보강 요청 / 스킵)
  ADD COLUMN IF NOT EXISTS parent_post_absence_action TEXT
    CHECK (parent_post_absence_action IN ('requested_makeup', 'skipped'));


-- 4. 학부모 lessons UPDATE RLS (보강 요청/스킵 + 보강 승인) -----
DROP POLICY IF EXISTS "lessons_parent_update_action" ON lessons;
CREATE POLICY "lessons_parent_update_action" ON lessons FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM packages p
    JOIN students s ON s.id = p.student_id
    WHERE p.id = lessons.package_id AND s.parent_id = auth.uid()
  )
);

-- 강사 lessons UPDATE 보강 슬롯 제안용 — 기존 lessons_teacher_update 정책으로 충분


-- 5. 학생 grade UI 라벨 정책 (참고용 주석) -----------------------
-- grade INTEGER는 그대로 유지. UI에서 "11th Grade" 표기로 변환 (코드에서 처리).


-- 6. 검증 쿼리 ------------------------------------------------
-- profiles 확인
SELECT 'profiles_timezone' AS check, count(*) AS rows FROM profiles WHERE timezone IS NOT NULL;
-- attendance_status enum 확인
SELECT 'attendance_status' AS check, enum_range(NULL::attendance_status) AS values;
-- lessons 신규 컬럼 확인
SELECT 'lessons_columns' AS check, column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='lessons'
  AND column_name LIKE 'noshow%' OR column_name LIKE 'makeup%' OR column_name LIKE 'parent_post%'
  ORDER BY column_name;
