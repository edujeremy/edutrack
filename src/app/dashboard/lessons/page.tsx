'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Filter, Loader2, AlertTriangle } from 'lucide-react';

type AttendanceStatus =
  | 'scheduled'
  | 'attended'
  | 'absent_notified'   // 통보 결석 (사전 알림)
  | 'no_show'           // 미통보 결석 (노쇼)
  | 'cancelled'
  | 'makeup_requested'  // 학부모가 보강 요청 → 강사 슬롯 대기
  | 'makeup_proposed'   // 강사가 슬롯 제안 → 학부모 승인 대기
  | 'makeup_scheduled'  // 보강 일정 확정
  | 'makeup_done'       // 보강 완료 (출석 처리)
  | 'skipped'           // 결석 후 스킵 (보강 안 함)
  | 'absent';           // (deprecated, 기존 데이터 호환)

const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  scheduled: '예정',
  attended: '출석',
  absent_notified: '통보 결석',
  no_show: '노쇼 (미통보)',
  cancelled: '취소',
  makeup_requested: '보강 요청',
  makeup_proposed: '보강 제안',
  makeup_scheduled: '보강 확정',
  makeup_done: '보강 완료',
  skipped: '스킵',
  absent: '결석',
};

interface Lesson {
  id: string;
  package_id: string;
  session_number: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  attendance: AttendanceStatus;
  absence_reason: string | null;
  is_billable: boolean;
  is_teacher_payable: boolean;
  noshow_admin_approved: boolean;
  noshow_note: string | null;
  parent_post_absence_action: 'requested_makeup' | 'skipped' | null;
  makeup_proposed_date: string | null;
  makeup_proposed_start: string | null;
  makeup_proposed_end: string | null;
  makeup_parent_approved: boolean;
  packages?: {
    name: string;
    student_id: string;
    teacher_id: string;
    students?: { name: string } | null;
    teachers?: { profiles?: { name: string } | null } | null;
  } | null;
  comments?: { status: string }[];
}

export default function LessonsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterAttendance, setFilterAttendance] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // 노쇼 승인 모달
  const [noShowLesson, setNoShowLesson] = useState<Lesson | null>(null);
  const [noShowBillable, setNoShowBillable] = useState(true);
  const [noShowPayable, setNoShowPayable] = useState(false);
  const [noShowNote, setNoShowNote] = useState('');

  // toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setAdminId(user.id);
      await fetchLessons();
      await fetchFilters();
    };

    checkAuthAndFetch();
  }, [router, supabase]);

  const fetchFilters = async () => {
    const { data: studentsData } = await supabase
      .from('students')
      .select('id, name')
      .order('name');
    setStudents(studentsData || []);

    const { data: teachersData } = await supabase
      .from('teachers')
      .select('id, profile_id, profiles(name)')
      .order('profiles(name)');
    setTeachers(teachersData || []);
  };

  const fetchLessons = async () => {
    setLoading(true);
    // 1단계: lessons 단순 fetch (packages join 없이) — schema cache 영향 최소화
    const { data: lessonsData, error: lessonsErr } = await supabase
      .from('lessons')
      .select('id, package_id, session_number, lesson_date, start_time, end_time, attendance, absence_reason, is_billable, is_teacher_payable, noshow_admin_approved, noshow_note, parent_post_absence_action, makeup_proposed_date, makeup_proposed_start, makeup_proposed_end, makeup_parent_approved')
      .order('lesson_date', { ascending: false });

    if (lessonsErr) {
      console.error('fetchLessons error', lessonsErr);
      setLessons([]);
      setLoading(false);
      return;
    }

    // 2단계: package_id 기반으로 packages·students·teachers·comments 별도 fetch (안전)
    const packageIds = Array.from(new Set((lessonsData || []).map((l: any) => l.package_id).filter(Boolean)));
    const lessonIds = (lessonsData || []).map((l: any) => l.id);

    const [{ data: packagesData }, { data: commentsData }] = await Promise.all([
      packageIds.length
        ? supabase.from('packages').select('id, name, student_id, teacher_id, students(name), teachers(profile_id, profiles(name))').in('id', packageIds)
        : Promise.resolve({ data: [] }),
      lessonIds.length
        ? supabase.from('comments').select('lesson_id, status').in('lesson_id', lessonIds)
        : Promise.resolve({ data: [] }),
    ]);

    const pkgMap = new Map((packagesData || []).map((p: any) => [p.id, p]));
    const cmtMap = new Map<string, string>();
    (commentsData || []).forEach((c: any) => cmtMap.set(c.lesson_id, c.status));

    // 합치기
    const merged: Lesson[] = (lessonsData || []).map((l: any) => {
      const pkg = pkgMap.get(l.package_id);
      return {
        ...l,
        packages: pkg ? {
          name: pkg.name,
          student_id: pkg.student_id,
          teacher_id: pkg.teacher_id,
          students: pkg.students,
          teachers: pkg.teachers,
        } : null,
        comments: cmtMap.has(l.id) ? [{ status: cmtMap.get(l.id)! }] : [],
      };
    });
    setLessons(merged);
    setLoading(false);
  };

  const filteredLessons = lessons.filter((lesson) => {
    if (filterDate && lesson.lesson_date !== filterDate) return false;
    if (filterStudent && lesson.packages?.student_id !== filterStudent) return false;
    if (filterTeacher && lesson.packages?.teacher_id !== filterTeacher) return false;
    if (filterAttendance && lesson.attendance !== filterAttendance) return false;
    return true;
  });

  // 출석 상태 변경 핸들러 — 비즈니스 룰 자동 적용
  const handleAttendanceChange = async (
    lesson: Lesson,
    newStatus: AttendanceStatus,
  ) => {
    // 노쇼는 모달 띄우기 (admin이 청구/지급 결정 + 비고 입력)
    if (newStatus === 'no_show') {
      setNoShowLesson(lesson);
      setNoShowBillable(true);
      setNoShowPayable(false);
      setNoShowNote('');
      return;
    }

    const updates: any = { attendance: newStatus };

    // 비즈니스 룰 자동 적용
    if (newStatus === 'attended') {
      // 출석: 청구·지급 모두 ON
      updates.is_billable = true;
      updates.is_teacher_payable = true;
    } else if (newStatus === 'absent_notified') {
      // 통보 결석: 청구·지급 모두 OFF (회차 카운트 안 함)
      updates.is_billable = false;
      updates.is_teacher_payable = false;
      updates.noshow_admin_approved = false;
    } else if (newStatus === 'cancelled' || newStatus === 'skipped') {
      updates.is_billable = false;
      updates.is_teacher_payable = false;
    } else if (newStatus === 'scheduled') {
      updates.is_billable = true;
      updates.is_teacher_payable = true;
    } else if (newStatus === 'makeup_done') {
      updates.is_billable = true;
      updates.is_teacher_payable = true;
    }

    if (newStatus !== 'absent_notified' && newStatus !== 'no_show' && newStatus !== 'absent') {
      updates.absence_reason = null;
    }

    const { error } = await supabase
      .from('lessons')
      .update(updates)
      .eq('id', lesson.id);

    if (error) {
      showToast(`업데이트 실패: ${error.message}`, 'error');
    } else {
      showToast(`출석 상태: ${ATTENDANCE_LABEL[newStatus]}`);
      fetchLessons();
    }
  };

  // 노쇼 모달 저장
  const handleNoShowApprove = async () => {
    if (!noShowLesson || !adminId) return;

    const { error } = await supabase
      .from('lessons')
      .update({
        attendance: 'no_show',
        is_billable: noShowBillable,
        is_teacher_payable: noShowPayable,
        noshow_admin_approved: true,
        noshow_approved_by: adminId,
        noshow_approved_at: new Date().toISOString(),
        noshow_note: noShowNote || null,
      })
      .eq('id', noShowLesson.id);

    if (error) {
      showToast(`노쇼 승인 실패: ${error.message}`, 'error');
    } else {
      showToast(`노쇼 승인 — 청구 ${noShowBillable ? 'O' : 'X'} / 지급 ${noShowPayable ? 'O' : 'X'}`);
      setNoShowLesson(null);
      fetchLessons();
    }
  };

  const toggleBillable = async (lessonId: string, current: boolean) => {
    await supabase.from('lessons').update({ is_billable: !current }).eq('id', lessonId);
    fetchLessons();
  };

  const toggleTeacherPayable = async (lessonId: string, current: boolean) => {
    await supabase.from('lessons').update({ is_teacher_payable: !current }).eq('id', lessonId);
    fetchLessons();
  };

  const getCommentStatus = (lesson: Lesson) => {
    if (!lesson.comments || lesson.comments.length === 0) return '미작성';
    const status = lesson.comments[0]?.status;
    if (status === 'submitted') return '제출됨';
    if (status === 'approved') return '승인됨';
    if (status === 'rejected') return '반려됨';
    return '초안';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">수업 일정</h1>
          <span className="text-sm text-gray-500">시간 기준: 캘리포니아 (PST/PDT)</span>
        </div>
        <p className="text-sm text-gray-600 mb-8">
          출석 변경 시 청구·강사 지급은 자동 적용됩니다. 노쇼는 원장 승인 모달에서 케이스별 결정.
        </p>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold">필터</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">날짜 (PST)</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">학생</label>
              <select
                value={filterStudent}
                onChange={(e) => setFilterStudent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">전체</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">선생님</label>
              <select
                value={filterTeacher}
                onChange={(e) => setFilterTeacher(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">전체</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {(teacher.profiles as any)?.name || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">출석상태</label>
              <select
                value={filterAttendance}
                onChange={(e) => setFilterAttendance(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">전체</option>
                <option value="scheduled">예정</option>
                <option value="attended">출석</option>
                <option value="absent_notified">통보 결석</option>
                <option value="no_show">노쇼</option>
                <option value="cancelled">취소</option>
                <option value="makeup_requested">보강 요청</option>
                <option value="makeup_proposed">보강 제안</option>
                <option value="makeup_scheduled">보강 확정</option>
                <option value="makeup_done">보강 완료</option>
                <option value="skipped">스킵</option>
                <option value="absent">(구) 결석</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lessons Table */}
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">날짜</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">학생</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">선생님</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">회차</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">시간 (PST)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">출석</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">청구</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">지급</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">코멘트</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLessons.map((lesson) => (
                <tr key={lesson.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{lesson.lesson_date}</td>
                  <td className="px-4 py-3 text-sm">
                    {lesson.packages?.students?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {lesson.packages?.teachers?.profiles?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">{lesson.session_number}</td>
                  <td className="px-4 py-3 text-sm">
                    {lesson.start_time?.slice(0, 5)} - {lesson.end_time?.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lesson.attendance}
                      onChange={(e) =>
                        handleAttendanceChange(lesson, e.target.value as AttendanceStatus)
                      }
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="scheduled">예정</option>
                      <option value="attended">출석</option>
                      <option value="absent_notified">통보 결석</option>
                      <option value="no_show">노쇼 (미통보)</option>
                      <option value="cancelled">취소</option>
                      <option value="makeup_requested">보강 요청</option>
                      <option value="makeup_proposed">보강 제안</option>
                      <option value="makeup_scheduled">보강 확정</option>
                      <option value="makeup_done">보강 완료</option>
                      <option value="skipped">스킵</option>
                      {lesson.attendance === 'absent' && (
                        <option value="absent">결석 (구)</option>
                      )}
                    </select>
                    {lesson.attendance === 'no_show' && lesson.noshow_admin_approved && (
                      <div className="mt-1 text-xs text-orange-700">
                        원장 승인 완료
                      </div>
                    )}
                    {lesson.attendance === 'no_show' && lesson.noshow_note && (
                      <div className="mt-1 text-xs text-gray-500">
                        비고: {lesson.noshow_note}
                      </div>
                    )}
                    {lesson.parent_post_absence_action === 'requested_makeup' && (
                      <div className="mt-1 text-xs text-blue-600">학부모: 보강 요청</div>
                    )}
                    {lesson.parent_post_absence_action === 'skipped' && (
                      <div className="mt-1 text-xs text-gray-500">학부모: 스킵</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleBillable(lesson.id, lesson.is_billable)}
                      className={`px-3 py-1 text-sm rounded font-medium ${
                        lesson.is_billable
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {lesson.is_billable ? '청구' : '미청구'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleTeacherPayable(lesson.id, lesson.is_teacher_payable)}
                      className={`px-3 py-1 text-sm rounded font-medium ${
                        lesson.is_teacher_payable
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {lesson.is_teacher_payable ? '지급' : '미지급'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">{getCommentStatus(lesson)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          총 {filteredLessons.length}개 수업
        </div>
      </div>

      {/* 노쇼 승인 모달 */}
      {noShowLesson && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setNoShowLesson(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="text-orange-500 mt-1" size={24} />
              <div>
                <h3 className="text-lg font-bold">노쇼(미통보 결석) 처리</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {noShowLesson.packages?.students?.name || '학생'} ·{' '}
                  {noShowLesson.lesson_date} {noShowLesson.start_time?.slice(0, 5)}
                </p>
                <p className="text-sm text-gray-600">
                  강사: {noShowLesson.packages?.teachers?.profiles?.name || 'N/A'}
                </p>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-4 text-sm text-orange-900">
              학부모 사전 통보 없이 결석. 원장 판단으로 청구·지급을 결정합니다.
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50">
                <div>
                  <div className="font-medium text-sm">학부모 수강료 청구</div>
                  <div className="text-xs text-gray-500">회차 카운트 + 청구 발행</div>
                </div>
                <input
                  type="checkbox"
                  checked={noShowBillable}
                  onChange={(e) => setNoShowBillable(e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <label className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50">
                <div>
                  <div className="font-medium text-sm">강사료 지급</div>
                  <div className="text-xs text-gray-500">강사 시간 보전 (대기료 등)</div>
                </div>
                <input
                  type="checkbox"
                  checked={noShowPayable}
                  onChange={(e) => setNoShowPayable(e.target.checked)}
                  className="w-5 h-5"
                />
              </label>

              <div>
                <label className="block text-sm font-medium mb-1">비고 (사유 기록)</label>
                <textarea
                  value={noShowNote}
                  onChange={(e) => setNoShowNote(e.target.value)}
                  rows={3}
                  placeholder="예: 30분 대기 후 연락 두절. 차량 사고 사후 통보."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setNoShowLesson(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleNoShowApprove}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded font-medium hover:bg-orange-600"
              >
                원장 승인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-white z-50 ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
