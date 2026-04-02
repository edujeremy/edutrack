'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, Loader2, Plus } from 'lucide-react';

interface Teacher {
  id: string;
  profile_id: string;
  per_session_rate: number;
  settlement_cycle: string;
  profiles?: { name: string };
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
  confirmed_at: string | null;
}

export default function PayPage() {
  const router = useRouter();
  const supabase = createClient();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingSettlement, setCreatingSettlement] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      // Check user role
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

      await fetchData();
    };

    checkAuthAndFetch();
  }, [router, supabase]);

  const fetchData = async () => {
    setLoading(true);
    const { data: teachersData } = await supabase
      .from('teachers')
      .select('id, profile_id, per_session_rate, settlement_cycle, profiles(name)')
      .order('profiles(name)');

    const { data: settlementsData } = await supabase
      .from('teacher_pay_settlements')
      .select('*')
      .order('period_start', { ascending: false });

    setTeachers(teachersData || []);
    setSettlements(settlementsData || []);
    setLoading(false);
  };

  const getApprovedSessionCount = async (
    teacherId: string,
    startDate: string,
    endDate: string,
  ): Promise<number> => {
    // Get all lessons for this teacher in the period with approved comments
    const { data } = await supabase
      .from('lessons')
      .select(`
        id,
        lesson_date,
        is_teacher_payable,
        packages(teacher_id),
        comments(status)
      `)
      .eq('packages.teacher_id', teacherId)
      .gte('lesson_date', startDate)
      .lte('lesson_date', endDate);

    if (!data) return 0;

    // Count lessons where is_teacher_payable is true and comment is approved
    return data.filter((lesson: any) => {
      const hasApprovedComment =
        lesson.comments && lesson.comments.some((c: any) => c.status === 'approved');
      return lesson.is_teacher_payable && hasApprovedComment;
    }).length;
  };

  const handleCreateSettlement = async (teacher: Teacher) => {
    if (!periodStart || !periodEnd) {
      alert('시작일과 종료일을 선택해주세요');
      return;
    }

    setCreatingSettlement(teacher.id);

    const sessionCount = await getApprovedSessionCount(teacher.id, periodStart, periodEnd);
    const totalAmount = sessionCount * teacher.per_session_rate;

    const { error } = await supabase.from('teacher_pay_settlements').insert({
      teacher_id: teacher.id,
      period_start: periodStart,
      period_end: periodEnd,
      session_count: sessionCount,
      per_session_rate: teacher.per_session_rate,
      total_amount: totalAmount,
      status: 'pending',
    });

    if (!error) {
      fetchData();
      setPeriodStart('');
      setPeriodEnd('');
      alert(`${(teacher.profiles as any)?.name || 'Teacher'} 정산이 생성되었습니다.`);
    } else {
      alert('정산 생성 중 오류가 발생했습니다');
    }

    setCreatingSettlement(null);
  };

  const handleMarkPaid = async (settlementId: string) => {
    const confirmed = window.confirm('이 정산을 "지급 완료"로 표시하시겠습니까?');
    if (!confirmed) return;

    await supabase
      .from('teacher_pay_settlements')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', settlementId);

    fetchData();
  };

  const getPendingAmount = async (teacher: Teacher): Promise<number> => {
    // Get latest settlement
    const { data: lastSettlement } = await supabase
      .from('teacher_pay_settlements')
      .select('period_end')
      .eq('teacher_id', teacher.id)
      .eq('status', 'confirmed')
      .order('period_end', { ascending: false })
      .limit(1)
      .single();

    const startDate = lastSettlement ? lastSettlement.period_end : '2020-01-01';
    const sessionCount = await getApprovedSessionCount(teacher.id, startDate, new Date().toISOString().split('T')[0]);
    return sessionCount * teacher.per_session_rate;
  };

  const [pendingAmounts, setPendingAmounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const fetchPending = async () => {
      const amounts: { [key: string]: number } = {};
      for (const teacher of teachers) {
        amounts[teacher.id] = await getPendingAmount(teacher);
      }
      setPendingAmounts(amounts);
    };
    if (teachers.length > 0) {
      fetchPending();
    }
  }, [teachers]);

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
        <h1 className="text-3xl font-bold mb-8 text-gray-900">선생님 페이</h1>

        {/* Settlement Period Selector */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={20} className="text-green-600" />
            <h2 className="text-lg font-semibold">정산 기간 선택</h2>
          </div>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">시작일</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">종료일</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Teachers List */}
        <div className="space-y-6">
          {teachers.map((teacher) => (
            <div key={teacher.id} className="bg-white p-6 rounded-lg shadow">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">선생님</p>
                  <p className="text-lg font-semibold">
                    {(teacher.profiles as any)?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">회차 기본료</p>
                  <p className="text-lg font-semibold">
                    ₩{teacher.per_session_rate.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">정산 주기</p>
                  <p className="text-lg font-semibold">{teacher.settlement_cycle}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">대기 중인 금액</p>
                  <p className="text-lg font-semibold text-blue-600">
                    ₩{(pendingAmounts[teacher.id] || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleCreateSettlement(teacher)}
                disabled={creatingSettlement === teacher.id || !periodStart || !periodEnd}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                정산 생성
              </button>
            </div>
          ))}
        </div>

        {/* Past Settlements */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">정산 내역</h2>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">선생님</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">기간</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">회차</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">기본료</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">합계</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">상태</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {settlements.map((settlement) => {
                  const teacher = teachers.find((t) => t.id === settlement.teacher_id);
                  return (
                    <tr key={settlement.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {(teacher?.profiles as any)?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {settlement.period_start} ~ {settlement.period_end}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {settlement.session_count}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        ₩{settlement.per_session_rate.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        ₩{settlement.total_amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            settlement.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : settlement.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {settlement.status === 'pending'
                            ? '대기중'
                            : settlement.status === 'paid'
                              ? '지급완료'
                              : '확인됨'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {settlement.status === 'pending' && (
                          <button
                            onClick={() => handleMarkPaid(settlement.id)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            지급
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
