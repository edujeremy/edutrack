'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, Loader2, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

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
  created_at: string;
}

interface TeacherPaySummary {
  teacher: Teacher;
  approvedSessions: ApprovedSession[];
  unsettledCount: number;
  unsettledAmount: number;
  settlements: Settlement[];
}

export default function PayPage() {
  const router = useRouter();
  const supabase = createClient();
  const [summaries, setSummaries] = useState<TeacherPaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [settlingTeacher, setSettlingTeacher] = useState<string | null>(null);

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

    // 1. Get all teachers
    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, profile_id, per_session_rate, settlement_cycle, profiles(name)');

    if (!teachers) { setLoading(false); return; }

    // 2. Get all settlements
    const { data: allSettlements } = await supabase
      .from('teacher_pay_settlements')
      .select('*')
      .order('created_at', { ascending: false });

    // 3. For each teacher, get approved sessions (lessons with approved comments)
    const results: TeacherPaySummary[] = [];

    for (const teacher of teachers) {
      // Get lessons with approved comments for this teacher
      const { data: lessons } = await supabase
        .from('lessons')
        .select(`
          id, lesson_date, session_number, is_teacher_payable,
          packages!inner(teacher_id, students(name)),
          comments(status, reviewed_at, created_at)
        `)
        .eq('packages.teacher_id', teacher.id)
        .in('attendance', ['attended', 'absent']);

      const approvedSessions: ApprovedSession[] = [];
      const teacherSettlements = (allSettlements || []).filter(s => s.teacher_id === teacher.id);

      // Find last settled date
      const paidSettlements = teacherSettlements.filter(s => s.status === 'paid' || s.status === 'confirmed');
      const lastSettledDate = paidSettlements.length > 0
        ? paidSettlements.reduce((latest, s) => s.period_end > latest ? s.period_end : latest, '2000-01-01')
        : null;

      if (lessons) {
        for (const lesson of lessons as any[]) {
          if (!lesson.is_teacher_payable) continue;

          // comments can be array or single object depending on Supabase response
          const commentsArr = Array.isArray(lesson.comments) ? lesson.comments : lesson.comments ? [lesson.comments] : [];
          const approvedComment = commentsArr.find((c: any) => c.status === 'approved');
          if (!approvedComment) continue;

          // packages with !inner can be object or array
          const pkg = Array.isArray(lesson.packages) ? lesson.packages[0] : lesson.packages;
          const studentName = pkg?.students?.name || '알 수 없음';
          const isSettled = lastSettledDate ? lesson.lesson_date <= lastSettledDate : false;

          // Also check pending settlements
          const inPendingSettlement = teacherSettlements.some(s =>
            s.status === 'pending' &&
            lesson.lesson_date >= s.period_start &&
            lesson.lesson_date <= s.period_end
          );

          approvedSessions.push({
            lesson_id: lesson.id,
            lesson_date: lesson.lesson_date,
            student_name: studentName,
            session_number: lesson.session_number,
            comment_approved_at: approvedComment.reviewed_at || approvedComment.created_at,
            is_settled: isSettled || inPendingSettlement,
          });
        }
      }

      approvedSessions.sort((a, b) => b.lesson_date.localeCompare(a.lesson_date));

      const unsettledSessions = approvedSessions.filter(s => !s.is_settled);

      results.push({
        teacher,
        approvedSessions,
        unsettledCount: unsettledSessions.length,
        unsettledAmount: unsettledSessions.length * teacher.per_session_rate,
        settlements: teacherSettlements,
      });
    }

    setSummaries(results);
    setLoading(false);
  };

  const handleCreateSettlement = async (summary: TeacherPaySummary) => {
    if (summary.unsettledCount === 0) {
      alert('정산할 미정산 세션이 없습니다.');
      return;
    }

    const confirmed = window.confirm(
      `${(summary.teacher.profiles as any)?.name}님의 미정산 ${summary.unsettledCount}회차 (${summary.unsettledAmount.toLocaleString()}원)를 정산하시겠습니까?`
    );
    if (!confirmed) return;

    setSettlingTeacher(summary.teacher.id);

    const unsettled = summary.approvedSessions.filter(s => !s.is_settled);
    const dates = unsettled.map(s => s.lesson_date).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];

    const { error } = await supabase.from('teacher_pay_settlements').insert({
      teacher_id: summary.teacher.id,
      period_start: periodStart,
      period_end: periodEnd,
      session_count: summary.unsettledCount,
      per_session_rate: summary.teacher.per_session_rate,
      total_amount: summary.unsettledAmount,
      status: 'pending',
    });

    if (error) {
      console.error('Settlement error:', error);
      alert('정산 생성 중 오류가 발생했습니다: ' + error.message);
    } else {
      alert(`${(summary.teacher.profiles as any)?.name}님 정산이 생성되었습니다.`);
      await fetchData();
    }
    setSettlingTeacher(null);
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
        <p className="text-gray-500 mb-8">코멘트 승인 → 페이 자동 누적 → 정산 생성 → 지급</p>

        {/* Teacher Pay Cards */}
        <div className="space-y-6">
          {summaries.map((summary) => {
            const isExpanded = expandedTeacher === summary.teacher.id;
            const teacherName = (summary.teacher.profiles as any)?.name || 'N/A';

            return (
              <div key={summary.teacher.id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Teacher Summary Header */}
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
                          회차당 {summary.teacher.per_session_rate.toLocaleString()}원
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">미정산</p>
                        <p className="text-xl font-bold text-orange-600">
                          {summary.unsettledCount}회 / {summary.unsettledAmount.toLocaleString()}원
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">총 승인</p>
                        <p className="text-xl font-bold text-gray-700">
                          {summary.approvedSessions.length}회
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Quick Action */}
                  {summary.unsettledCount > 0 && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCreateSettlement(summary); }}
                        disabled={settlingTeacher === summary.teacher.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {settlingTeacher === summary.teacher.id ? '처리 중...' : `${summary.unsettledCount}회차 정산 생성`}
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {/* Approved Sessions List */}
                    <div className="p-6">
                      <h4 className="font-semibold text-gray-700 mb-3">승인된 세션 내역</h4>
                      {summary.approvedSessions.length === 0 ? (
                        <p className="text-gray-400 text-sm">승인된 세션이 없습니다.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">날짜</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">학생</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-600">회차</th>
                                <th className="px-3 py-2 text-right font-medium text-gray-600">금액</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-600">상태</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {summary.approvedSessions.map((session) => (
                                <tr key={session.lesson_id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2">{session.lesson_date}</td>
                                  <td className="px-3 py-2">{session.student_name}</td>
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
                                  {settlement.session_count}회 × {settlement.per_session_rate.toLocaleString()}원
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
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
