'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Download, Loader2, Calendar } from 'lucide-react';

export default function ExportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
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
    };

    checkAuth();
  }, [router, supabase]);

  const downloadCSV = (filename: string, csv: string) => {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleTeacherLessons = async () => {
    if (!startDate || !endDate) {
      alert('시작일과 종료일을 선택해주세요');
      return;
    }

    setLoading(true);

    const { data: lessons, error } = await supabase
      .from('lessons')
      .select(`
        id,
        lesson_date,
        attendance,
        comments(status),
        packages(
          name,
          teacher_id,
          student_id,
          teachers(profile_id, profiles(name)),
          students(name)
        )
      `)
      .gte('lesson_date', startDate)
      .lte('lesson_date', endDate)
      .order('lesson_date');

    if (!error && lessons) {
      const rows: string[] = [
        ['선생님', '수업날짜', '학생', '출석상태', '코멘트상태'].join(','),
      ];

      const lessonMap = new Map<string, any[]>();

      lessons.forEach((lesson: any) => {
        const teacherName = (lesson.packages?.teachers?.profiles as any)?.name || 'N/A';
        const studentName = (lesson.packages?.students as any)?.name || 'N/A';
        const attendance = lesson.attendance;
        const commentStatus = lesson.comments?.[0]?.status || '미작성';

        if (!lessonMap.has(teacherName)) {
          lessonMap.set(teacherName, []);
        }

        lessonMap.get(teacherName)!.push({
          date: lesson.lesson_date,
          student: studentName,
          attendance,
          comment: commentStatus,
        });
      });

      lessonMap.forEach((lessonList, teacherName) => {
        lessonList.forEach((lesson) => {
          rows.push(
            [
              escapeCSV(teacherName),
              escapeCSV(lesson.date),
              escapeCSV(lesson.student),
              escapeCSV(lesson.attendance),
              escapeCSV(lesson.comment),
            ].join(','),
          );
        });
      });

      const csv = rows.join('\n');
      downloadCSV(
        `선생님수업기록_${startDate}_${endDate}.csv`,
        csv,
      );
    }

    setLoading(false);
  };

  const handleStudentRecords = async () => {
    if (!startDate || !endDate) {
      alert('시작일과 종료일을 선택해주세요');
      return;
    }

    setLoading(true);

    const { data: lessons, error } = await supabase
      .from('lessons')
      .select(`
        id,
        lesson_date,
        attendance,
        packages(
          student_id,
          students(name)
        ),
        comments(
          progress,
          homework_evaluation,
          strengths,
          improvements,
          homework,
          status
        )
      `)
      .gte('lesson_date', startDate)
      .lte('lesson_date', endDate)
      .order('lesson_date');

    if (!error && lessons) {
      const rows: string[] = [
        [
          '학생',
          '수업날짜',
          '출석상태',
          '진도',
          '숙제평가',
          '강점',
          '개선점',
          '숙제',
          '코멘트상태',
        ].join(','),
      ];

      lessons.forEach((lesson: any) => {
        const studentName = (lesson.packages?.students as any)?.name || 'N/A';
        const attendance = lesson.attendance;
        const comment = lesson.comments?.[0];

        rows.push(
          [
            escapeCSV(studentName),
            escapeCSV(lesson.lesson_date),
            escapeCSV(attendance),
            escapeCSV(comment?.progress || ''),
            escapeCSV(comment?.homework_evaluation || ''),
            escapeCSV(comment?.strengths || ''),
            escapeCSV(comment?.improvements || ''),
            escapeCSV(comment?.homework || ''),
            escapeCSV(comment?.status || '미작성'),
          ].join(','),
        );
      });

      const csv = rows.join('\n');
      downloadCSV(
        `학생기록_${startDate}_${endDate}.csv`,
        csv,
      );
    }

    setLoading(false);
  };

  const handlePaySettlements = async () => {
    if (!startDate || !endDate) {
      alert('시작일과 종료일을 선택해주세요');
      return;
    }

    setLoading(true);

    const { data: settlements, error } = await supabase
      .from('teacher_pay_settlements')
      .select(`
        id,
        period_start,
        period_end,
        session_count,
        per_session_rate,
        total_amount,
        status,
        teacher_id,
        teachers(profile_id, profiles(name))
      `)
      .gte('period_start', startDate)
      .lte('period_end', endDate)
      .order('period_start');

    if (!error && settlements) {
      const rows: string[] = [
        ['선생님', '정산기간 시작', '정산기간 종료', '수업회차', '회차기본료', '총액', '상태'].join(','),
      ];

      settlements.forEach((settlement: any) => {
        const teacherName = (settlement.teachers?.profiles as any)?.name || 'N/A';

        rows.push(
          [
            escapeCSV(teacherName),
            escapeCSV(settlement.period_start),
            escapeCSV(settlement.period_end),
            escapeCSV(settlement.session_count),
            escapeCSV(`₩${settlement.per_session_rate.toLocaleString()}`),
            escapeCSV(`₩${settlement.total_amount.toLocaleString()}`),
            escapeCSV(
              settlement.status === 'pending'
                ? '대기중'
                : settlement.status === 'paid'
                  ? '지급완료'
                  : '확인됨',
            ),
          ].join(','),
        );
      });

      const csv = rows.join('\n');
      downloadCSV(
        `페이정산_${startDate}_${endDate}.csv`,
        csv,
      );
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">CSV 내보내기</h1>

        {/* Date Range Selector */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold">기간 선택</h2>
          </div>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">선생님 수업 기록</h3>
                <p className="text-sm text-gray-600">
                  선생님별 수업 날짜, 학생, 출석상태, 코멘트 상태
                </p>
              </div>
              <button
                onClick={handleTeacherLessons}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                내보내기
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">학생 기록 + 코멘트</h3>
                <p className="text-sm text-gray-600">
                  학생별 수업 날짜, 출석상태, 진도, 숙제평가, 강점, 개선점, 숙제, 코멘트 상태
                </p>
              </div>
              <button
                onClick={handleStudentRecords}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                내보내기
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">선생님 페이 정산</h3>
                <p className="text-sm text-gray-600">
                  선생님별 정산 기간, 수업회차, 기본료, 합계, 정산 상태
                </p>
              </div>
              <button
                onClick={handlePaySettlements}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                내보내기
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            팁: 기간을 선택하고 원하는 내보내기 버튼을 클릭하면 CSV 파일이 다운로드됩니다. 모든 파일은 한글 인코딩으로 저장되어 Excel에서 바로 열 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
