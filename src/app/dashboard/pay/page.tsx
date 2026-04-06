'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, Loader2, CheckCircle, Clock, ChevronDown, ChevronUp, Users } from 'lucide-react';

interface Teacher {
  id: string;
  profile_id: string;
  per_session_rate: number;
  settlement_cycle: string;
  profiles?: { name: string };
}

interface ApprovedSession {
  lesson_id: string;
  lesson_date: string;
  student_name: string;
  student_id: string;
  package_id: string;
  package_name: string;
  session_number: number;
  comment_approved_at: string;
  is_settled: boolean;
}

interface Settlement {
  id: string;
  teacher_id: string;
  period_start: string;
  period_end: string;
  session_count: number;
  per_session_rate: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'confirmed';
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

interface StudentGroup {
  student_id: string;
  student_name: string;
  package_id: string;
  package_name: string;
  sessions: ApprovedSession[];
  unsettledSessions: ApprovedSession[];
  unsettledCount: number;
  unsettledAmount: number;
}

interface TeacherPaySummary {
  teacher: Teacher;
  studentGroups: StudentGroup[];
  totalUnsettled: number;
  totalUnsettledAmount: number;
  totalApproved: number;
  settlements: Settlement[];
}

export default function PayPage() {
  const router = useRouter();
  const supabase = createClient();
  const [summaries, setSummaries] = useState<TeacherPaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [settlingKey, setSettlingKey] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') { router.push('/dashboard'); return; }
      await fetchData();
    };
    checkAuthAndFetch();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, profile_id, per_session_rate, settlement_cycle, profiles(name)');

    if (!teachers) { setLoading(false); return; }

    const { data: allSettlements } = await supabase
      .from('teacher_pay_settlements')
      .select('*')
      .order('created_at', { ascending: false });

    const results: TeacherPaySummary[] = [];

    for (const teacher of teachers) {
      const { data: lessons } = await supabase
        .from('lessons')
        .select(`
          id, lesson_date, session_number, is_teacher_payable, package_id,
          packages!inner(teacher_id, student_id, name, students(id, name)),
          comments(status, reviewed_at, created_at)
        `)
        .eq('packages.teacher_id', teacher.id)
        .in('attendance', ['attended', 'absent']);

      const teacherSettlements = (allSettlements || []).filter(s => s.teacher_id === teacher.id);
      const paidSettlements = teacherSettlements.filter(s => s.status === 'paid' || s.status === 'confirmed');
      const lastSettledDate = paidSettlements.length > 0
        ? paidSettlements.reduce((latest, s) => s.period_end > latest ? s.period_end : latest, '2000-01-01')
        : null;

      // Group by student
      const studentMap = new Map<string, StudentGroup>();

      if (lessons) {
        for (const lesson of lessons as any[]) {
          if (!lesson.is_teacher_payable) continue;

          const commentsArr = Array.isArray(lesson.comments) ? lesson.comments : lesson.comments ? [lesson.comments] : [];
          const approvedComment = commentsArr.find((c: any) => c.status === 'approved');
          if (!approvedComment) continue;

          const pkg = Array.isArray(lesson.packages) ? lesson.packages[0] : lesson.packages;
          const studentId = pkg?.student_id || 'unknown';
          const studentName = pkg?.students?.name || '알 수 없음';
          const packageId = lesson.package_id;
          const packageName = pkg?.name || '';

          const isSettled = lastSettledDate ? lesson.lesson_date <= lastSettledDate : false;
          const inPendingSettlement = teacherSettlements.some(s =>
            s.status === 'pending' &&
            lesson.lesson_date >= s.period_start &&
            lesson.lesson_date <= s.period_end
          );

          const session: ApprovedSession = {
            lesson_id: lesson.id,
            lesson_date: lesson.lesson_date,
            student_name: studentName,
            student_id: studentId,
            package_id: packageId,
            package_name: packageName,
            session_number: lesson.session_number,
            comment_approved_at: approvedComment.reviewed_at || approvedComment.created_at,
            is_settled: isSettled || inPendingSettlement,
          };

          const key = `${studentId}_${packageId}`;
          if (!studentMap.has(key)) {
            studentMap.set(key, {
              student_id: studentId,
              student_name: studentName,
              package_id: packageId,
              package_name: packageName,
              sessions: [],
              unsettledSessions: [],
              unsettledCount: 0,
              unsettledAmount: 0,
            });
          }
          const group = studentMap.get(key)!;
          group.sessions.push(session);
          if (!session.is_settled) {
            group.unsettledSessions.push(session);
          }
        }
      }

      // Calculate unsettled per group
      const studentGroups = Array.from(studentMap.values());
      for (const g of studentGroups) {
        g.unsettledCount = g.unsettledSessions.length;
        g.unsettledAmount = g.unsettledCount * teacher.per_session_rate;
        g.sessions.sort((a, b) => b.lesson_date.localeCompare(a.lesson_date));
      }
      studentGroups.sort((a, b) => b.unsettledCount - a.unsettledCount);

      const totalUnsettled = studentGroups.reduce((sum, g) => sum + g.unsettledCount, 0);
      const totalUnsettledAmount = studentGroups.reduce((sum, g) => sum + g.unsettledAmount, 0);
      const totalApproved = studentGroups.reduce((sum, g) => sum + g.sessions.length, 0);

      results.push({
        teacher,
        studentGroups,
        totalUnsettled,
        totalUnsettledAmount,
        totalApproved,
        settlements: teacherSettlements,
      });
    }

    setSummaries(results);
    setLoading(false);
  };

  // 학생별 정산 생성
  const handleCreateStudentSettlement = async (summary: TeacherPaySummary, group: StudentGroup) => {
    if (group.unsettledCount === 0) {
      alert('정산할 미정산 세션이 없습니다.');
      return;
    }

    const teacherName = (summary.teacher.profiles as any)?.name || '';
    const confirmed = window.confirm(
      `${teacherName}님 - ${group.student_name} (${group.package_name})\n미정산 ${group.unsettledCount}회차 (${group.unsettledAmount.toLocaleString()}원)를 정산하시겠습니까?`
    );
    if (!confirmed) return;

    const key = `${summary.teacher.id}_${group.student_id}`;
    setSettlingKey(key);

    const dates = group.unsettledSessions.map(s => s.lesson_date).sort();

    const { error } = await supabase.from('teacher_pay_settlements').insert({
      teacher_id: summary.teacher.id,
      period_start: dates[0],
      period_end: dates[dates.length - 1],
      session_count: group.unsettledCount,
      per_session_rate: summary.teacher.per_session_rate,
      total_amount: group.unsettledAmount,
      status: 'pending',
      notes: `${group.student_name} (${group.package_name})`,
    });

    if (error) {
      alert('정산 생성 오류: ' + error.message);
    } else {
      alert(`${group.student_name} 정산이 생성되었습니다.`);
      await fetchData();
    }
    setSettlingKey(null);
  };

  // 선생님 전체 일괄 정산
  const handleCreateBulkSettlement = async (summary: TeacherPaySummary) => {
    if (summary.totalUnsettled === 0) {
      alert('정산할 미정산 세션이 없습니다.');
      return;
    }

    const teacherName = (summary.teacher.profiles as any)?.name || '';
    const studentList = summary.studentGroups
      .filter(g => g.unsettledCount > 0)
      .map(g => `  ${g.student_name}: ${g.unsettledCount}회`)
      .join('\n');

    const confirmed = window.confirm(
      `${teacherName}님 전체 미정산을 일괄 정산하시겠습니까?\n\n${studentList}\n\n총 ${summary.totalUnsettled}회차 (${summary.totalUnsettledAmount.toLocaleString()}원)`
    );
    if (!confirmed) return;

    setSettlingKey(summary.teacher.id);

    // 학생별로 각각 정산 레코드 생성
    for (const group of summary.studentGroups) {
      if (group.unsettledCount === 0) continue;
      const dates = group.unsettledSessions.map(s => s.lesson_date).sort();

      await supabase.from('teacher_pay_settlements').insert({
        teacher_id: summary.teacher.id,
        period_start: dates[0],
        period_end: dates[dates.length - 1],
        session_count: group.unsettledCount,
        per_session_rate: summary.teacher.per_session_rate,
        total_amount: group.unsettledAmount,
        status: 'pending',
        notes: `${group.student_name} (${group.package_name})`,
      });
    }

    alert(`${teacherName}님 전체 정산이 생성되었습니다.`);
    await fetchData();
    setSettlingKey(null);
  };

  const handleMarkPaid = async (settlementId: string) => {
    const confirmed = window.confirm('이 정산을 "지급 완료"로 표시하시겠습니까?');
    if (!confirmed) return;

    await supabase
      .from('teacher_pay_settlements')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', settlementId);

    await fetchData();
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
        <h1 className="text-3xl font-bold mb-2 text-gray-900">선생님 페이 정산</h1>
        <p className="text-gray-500 mb-8">코멘트 승인 → 페이 자동 누적 → 학생별 정산 생성 → 지급</p>

        <div className="space-y-6">
          {summaries.map((summary) => {
            const isExpanded = expandedTeacher === summary.teacher.id;
            const teacherName = (summary.teacher.profiles as any)?.name || 'N/A';

            return (
              <div key={summary.teacher.id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Teacher Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedTeacher(isExpanded ? null : summary.teacher.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                        <DollarSign className="text-indigo-600" size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{teacherName}</h3>
                        <p className="text-sm text-gray-500">
                          회차당 {summary.teacher.per_session_rate.toLocaleString()}원 · 학생 {summary.studentGroups.length}명
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">미정산</p>
                        <p className={`text-xl font-bold ${summary.totalUnsettled > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                          {summary.totalUnsettled}회 / {summary.totalUnsettledAmount.toLocaleString()}원
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">총 승인</p>
                        <p className="text-xl font-bold text-gray-700">
                          {summary.totalApproved}회
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Bulk settle button */}
                  {summary.totalUnsettled > 0 && (
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCreateBulkSettlement(summary); }}
                        disabled={settlingKey === summary.teacher.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {settlingKey === summary.teacher.id ? '처리 중...' : `전체 ${summary.totalUnsettled}회차 일괄 정산`}
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded: Student-by-student breakdown */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {/* Student Groups */}
                    <div className="p-6 space-y-4">
                      <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                        <Users size={16} /> 학생별 세션 내역
                      </h4>

                      {summary.studentGroups.length === 0 ? (
                        <p className="text-gray-400 text-sm">승인된 세션이 없습니다.</p>
                      ) : (
                        summary.studentGroups.map((group) => {
                          const groupKey = `${summary.teacher.id}_${group.student_id}_${group.package_id}`;
                          const isStudentExpanded = expandedStudent === groupKey;

                          return (
                            <div key={groupKey} className="border rounded-lg overflow-hidden">
                              <div
                                className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between"
                                onClick={() => setExpandedStudent(isStudentExpanded ? null : groupKey)}
                              >
                                <div>
                                  <span className="font-semibold text-gray-900">{group.student_name}</span>
                                  <span className="text-sm text-gray-500 ml-2">{group.package_name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  {group.unsettledCount > 0 && (
                                    <span className="text-sm font-bold text-orange-600">
                                      미정산 {group.unsettledCount}회 ({group.unsettledAmount.toLocaleString()}원)
                                    </span>
                                  )}
                                  <span className="text-sm text-gray-500">
                                    총 {group.sessions.length}회
                                  </span>
                                  {group.unsettledCount > 0 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleCreateStudentSettlement(summary, group); }}
                                      disabled={settlingKey === `${summary.teacher.id}_${group.student_id}`}
                                      className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                                    >
                                      정산
                                    </button>
                                  )}
                                  {isStudentExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                              </div>

                              {isStudentExpanded && (
                                <div className="p-4">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-medium text-gray-600">날짜</th>
                                        <th className="px-3 py-2 text-center font-medium text-gray-600">회차</th>
                                        <th className="px-3 py-2 text-right font-medium text-gray-600">금액</th>
                                        <th className="px-3 py-2 text-center font-medium text-gray-600">상태</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                      {group.sessions.map((session) => (
                                        <tr key={session.lesson_id} className="hover:bg-gray-50">
                                          <td className="px-3 py-2">{session.lesson_date}</td>
                                          <td className="px-3 py-2 text-center">{session.session_number}회차</td>
                                          <td className="px-3 py-2 text-right">
                                            {summary.teacher.per_session_rate.toLocaleString()}원
                                          </td>
                                          <td className="px-3 py-2 text-center">
                                            {session.is_settled ? (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                                                <CheckCircle size={12} /> 정산됨
                                              </span>
                                            ) : (
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs">
                                                <Clock size={12} /> 미정산
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Past Settlements */}
                    {summary.settlements.length > 0 && (
                      <div className="p-6 border-t border-gray-100 bg-gray-50">
                        <h4 className="font-semibold text-gray-700 mb-3">정산 이력</h4>
                        <div className="space-y-2">
                          {summary.settlements.map((settlement) => (
                            <div
                              key={settlement.id}
                              className="flex items-center justify-between bg-white p-4 rounded-lg border"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {settlement.period_start} ~ {settlement.period_end}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {settlement.notes || `${settlement.session_count}회`} × {settlement.per_session_rate.toLocaleString()}원
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <p className="font-bold text-gray-900">
                                  {settlement.total_amount.toLocaleString()}원
                                </p>
                                {settlement.status === 'pending' ? (
                                  <button
                                    onClick={() => handleMarkPaid(settlement.id)}
                                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    지급 완료
                                  </button>
                                ) : settlement.status === 'confirmed' ? (
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ 확인됨
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    지급완료
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {summaries.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-400">등록된 선생님이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
