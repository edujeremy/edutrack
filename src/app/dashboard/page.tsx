'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'teacher' | 'parent';
  email: string;
}

interface DashboardStats {
  pendingCommentsCount: number;
  activeStudentsCount: number;
  upcomingLessonsCount: number;
  unpaidTuitionCount: number;
}

interface RecentComment {
  id: string;
  student_name: string;
  teacher_name: string;
  lesson_date: string;
  session_number: number;
  progress: string;
}

interface AbsenceRequest {
  id: string;
  student_name: string;
  lesson_date: string;
  reason: string;
}

interface AbsentLesson {
  id: string;
  lesson_date: string;
  session_number: number;
  student_name: string;
  teacher_name: string;
  is_billable: boolean;
  is_teacher_payable: boolean;
}

interface ConsultationItem {
  id: string;
  parent_name: string;
  student_name: string;
  subject: string;
  message: string;
  preferred_date: string | null;
  preferred_time: string | null;
  status: string;
  created_at: string;
}

interface UnpaidPackage {
  id: string;
  student_name: string;
  package_name: string;
  tuition_fee: number;
  total_sessions: number;
  completed_sessions: number;
}

interface PendingTeacherPay {
  teacher_name: string;
  teacher_id: string;
  unpaid_sessions: number;
  rate_per_session: number;
  estimated_amount: number;
}

interface UpcomingLesson {
  id: string;
  student_name: string;
  start_time: string;
  end_time: string;
  lesson_date: string;
}

interface StudentSessionCount {
  student_name: string;
  package_name: string;
  attended: number;
  total: number;
}

interface PaySettlement {
  id: string;
  period_start: string;
  period_end: string;
  session_count: number;
  total_amount: number;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Admin stats
  const [stats, setStats] = useState<DashboardStats>({
    pendingCommentsCount: 0,
    activeStudentsCount: 0,
    upcomingLessonsCount: 0,
    unpaidTuitionCount: 0,
  });
  const [recentComments, setRecentComments] = useState<RecentComment[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [unpaidPackages, setUnpaidPackages] = useState<UnpaidPackage[]>([]);
  const [pendingTeacherPay, setPendingTeacherPay] = useState<PendingTeacherPay[]>([]);
  const [absentLessons, setAbsentLessons] = useState<AbsentLesson[]>([]);
  const [consultationItems, setConsultationItems] = useState<ConsultationItem[]>([]);

  // Teacher data
  const [upcomingLessons, setUpcomingLessons] = useState<UpcomingLesson[]>([]);
  const [pendingCommentLessons, setPendingCommentLessons] = useState<UpcomingLesson[]>([]);
  const [paySettlements, setPaySettlements] = useState<PaySettlement[]>([]);
  const [studentSessionCounts, setStudentSessionCounts] = useState<StudentSessionCount[]>([]);

  // Parent data
  const [childUpcomingLessons, setChildUpcomingLessons] = useState<UpcomingLesson[]>([]);
  const [childRecentComments, setChildRecentComments] = useState<RecentComment[]>([]);
  const [packageProgress, setPackageProgress] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user?.id) {
          setError('로그인이 필요합니다');
          return;
        }

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single();

        if (profileError || !profileData) {
          setError('프로필을 불러올 수 없습니다');
          return;
        }

        setUser(profileData);

        // 학부모는 캘린더가 주 인터페이스
        if (profileData.role === 'parent') {
          router.replace('/dashboard/calendar');
          return;
        }

        if (profileData.role === 'admin') {
          await loadAdminDashboard();
        } else if (profileData.role === 'teacher') {
          await loadTeacherDashboard(sessionData.session.user.id);
        }
      } catch (err) {
        setError('대시보드를 불러올 수 없습니다');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [supabase]);

  const loadAdminDashboard = async () => {
    try {
      // Pending comments count
      const { count: pendingCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');
      setStats(prev => ({ ...prev, pendingCommentsCount: pendingCount || 0 }));

      // Active students count
      const { count: studentsCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      setStats(prev => ({ ...prev, activeStudentsCount: studentsCount || 0 }));

      // Upcoming lessons today
      const today = new Date().toISOString().split('T')[0];
      const { data: lessonsData, count: lessonsCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact' })
        .eq('lesson_date', today)
        .eq('attendance', 'scheduled');
      setStats(prev => ({ ...prev, upcomingLessonsCount: lessonsCount || 0 }));

      // Unpaid tuition count
      const { count: unpaidCount } = await supabase
        .from('packages')
        .select('*', { count: 'exact', head: true })
        .eq('tuition_status', 'unpaid');
      setStats(prev => ({ ...prev, unpaidTuitionCount: unpaidCount || 0 }));

      // Recent submitted comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select(
          `
          id,
          progress,
          submitted_at,
          lesson_id,
          teacher_id,
          lessons(session_number, lesson_date, packages(students(name))),
          profiles(name)
        `
        )
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(5);

      const formattedComments = commentsData?.map((c: any) => ({
        id: c.id,
        student_name: c.lessons?.packages?.students?.name || 'Unknown',
        teacher_name: c.profiles?.name || 'Unknown',
        lesson_date: c.lessons?.lesson_date || '',
        session_number: c.lessons?.session_number || 0,
        progress: c.progress || '',
      })) || [];
      setRecentComments(formattedComments);

      // Recent absence requests
      const { data: absenceData } = await supabase
        .from('absence_requests')
        .select(
          `
          id,
          reason,
          status,
          lessons(lesson_date, packages(students(name)))
        `
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      const formattedAbsence = absenceData?.map((a: any) => ({
        id: a.id,
        student_name: a.lessons?.packages?.students?.name || 'Unknown',
        lesson_date: a.lessons?.lesson_date || '',
        reason: a.reason || '',
      })) || [];
      setAbsenceRequests(formattedAbsence);

      // Unpaid packages (수강료 미납)
      const { data: unpaidPkgs } = await supabase
        .from('packages')
        .select('id, name, tuition_fee, total_sessions, completed_sessions, students(name)')
        .eq('tuition_status', 'unpaid')
        .eq('status', 'active')
        .limit(10);

      const formattedUnpaid = unpaidPkgs?.map((p: any) => ({
        id: p.id,
        student_name: p.students?.name || 'Unknown',
        package_name: p.name || '',
        tuition_fee: p.tuition_fee || 0,
        total_sessions: p.total_sessions || 0,
        completed_sessions: p.completed_sessions || 0,
      })) || [];
      setUnpaidPackages(formattedUnpaid);

      // Pending teacher pay (강사 미지급)
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id, profile_id, rate_per_session, profiles(name)')
        .eq('status', 'active');

      if (teacherData && teacherData.length > 0) {
        const teacherPayList: PendingTeacherPay[] = [];
        for (const teacher of teacherData) {
          // Count attended lessons with approved comments but no settlement
          const { count: unpaidCount } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('attendance', 'attended')
            .eq('is_teacher_payable', true)
            .eq('packages.teacher_id', teacher.id);

          const rate = teacher.rate_per_session || 0;
          const sessions = unpaidCount || 0;
          if (sessions > 0) {
            teacherPayList.push({
              teacher_name: (teacher as any).profiles?.name || 'Unknown',
              teacher_id: teacher.id,
              unpaid_sessions: sessions,
              rate_per_session: rate,
              estimated_amount: rate * sessions,
            });
          }
        }
        setPendingTeacherPay(teacherPayList);
      }

      // Recent absent lessons (결석 수업 - 청구/지급 처리 필요)
      const { data: absentData } = await supabase
        .from('lessons')
        .select(`
          id, lesson_date, session_number, is_billable, is_teacher_payable,
          packages(students(name), teachers(profiles(name)))
        `)
        .eq('attendance', 'absent')
        .order('lesson_date', { ascending: false })
        .limit(10);

      const formattedAbsent = absentData?.map((l: any) => ({
        id: l.id,
        lesson_date: l.lesson_date,
        session_number: l.session_number,
        student_name: l.packages?.students?.name || 'Unknown',
        teacher_name: l.packages?.teachers?.profiles?.name || 'Unknown',
        is_billable: l.is_billable,
        is_teacher_payable: l.is_teacher_payable,
      })) || [];
      setAbsentLessons(formattedAbsent);

      // Pending consultation requests (상담 요청)
      const { data: consultData } = await supabase
        .from('consultation_requests')
        .select(`
          id, subject, message, preferred_date, preferred_time, status, created_at,
          profiles(name),
          students(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      const formattedConsult = consultData?.map((c: any) => ({
        id: c.id,
        parent_name: c.profiles?.name || 'Unknown',
        student_name: c.students?.name || 'Unknown',
        subject: c.subject || '',
        message: c.message || '',
        preferred_date: c.preferred_date,
        preferred_time: c.preferred_time,
        status: c.status,
        created_at: c.created_at,
      })) || [];
      setConsultationItems(formattedConsult);
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    }
  };

  const loadTeacherDashboard = async (teacherId: string) => {
    try {
      // Get upcoming lessons today
      const today = new Date().toISOString().split('T')[0];
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select(
          `
          id,
          lesson_date,
          start_time,
          end_time,
          packages(student_id, students(name))
        `
        )
        .eq('packages.teacher_id', teacherId)
        .eq('lesson_date', today)
        .eq('attendance', 'scheduled')
        .order('start_time');

      const formattedLessons = lessonsData?.map((l: any) => ({
        id: l.id,
        student_name: l.packages?.students?.name || 'Unknown',
        start_time: l.start_time || '',
        end_time: l.end_time || '',
        lesson_date: l.lesson_date || '',
      })) || [];
      setUpcomingLessons(formattedLessons);

      // Get pending comments to write (lessons without comments)
      const { data: pendingData } = await supabase
        .from('lessons')
        .select(
          `
          id,
          lesson_date,
          start_time,
          end_time,
          session_number,
          packages(student_id, students(name)),
          comments(id)
        `
        )
        .eq('packages.teacher_id', teacherId)
        .eq('attendance', 'attended')
        .order('lesson_date', { ascending: false })
        .limit(10);

      const pendingLessons = pendingData?.filter((l: any) => l.comments?.length === 0).map((l: any) => ({
        id: l.id,
        student_name: l.packages?.students?.name || 'Unknown',
        start_time: l.start_time || '',
        end_time: l.end_time || '',
        lesson_date: l.lesson_date || '',
      })) || [];
      setPendingCommentLessons(pendingLessons);

      // Get recent pay settlements
      const { data: settlementData } = await supabase
        .from('teacher_pay_settlements')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('period_end', { ascending: false })
        .limit(5);

      const formattedSettlements = settlementData?.map((s: any) => ({
        id: s.id,
        period_start: s.period_start,
        period_end: s.period_end,
        session_count: s.session_count,
        total_amount: s.total_amount,
        status: s.status,
      })) || [];
      setPaySettlements(formattedSettlements);

      // Get student session counts for this teacher
      const { data: teacherRecord } = await supabase
        .from('teachers')
        .select('id')
        .eq('profile_id', teacherId)
        .maybeSingle();

      if (teacherRecord) {
        const { data: myPackages } = await supabase
          .from('packages')
          .select('id, name, total_sessions, student_id, students(name)')
          .eq('teacher_id', teacherRecord.id)
          .eq('status', 'active');

        if (myPackages && myPackages.length > 0) {
          const counts: StudentSessionCount[] = [];
          for (const pkg of myPackages) {
            const { count: attendedCount } = await supabase
              .from('lessons')
              .select('*', { count: 'exact', head: true })
              .eq('package_id', pkg.id)
              .eq('attendance', 'attended');

            counts.push({
              student_name: (pkg as any).students?.name || 'Unknown',
              package_name: pkg.name || '',
              attended: attendedCount || 0,
              total: pkg.total_sessions || 0,
            });
          }
          setStudentSessionCounts(counts);
        }
      }
    } catch (err) {
      console.error('Error loading teacher dashboard:', err);
    }
  };

  const loadParentDashboard = async (parentId: string) => {
    try {
      // 1. 먼저 학부모의 자녀 목록 조회
      const { data: myStudents } = await supabase
        .from('students')
        .select('id, name')
        .eq('parent_id', parentId);

      const studentIds = myStudents?.map(s => s.id) || [];

      if (studentIds.length === 0) {
        // 자녀가 없으면 빈 상태
        setChildUpcomingLessons([]);
        setChildRecentComments([]);
        setPackageProgress([]);
        return;
      }

      // 2. 자녀의 패키지 ID 조회
      const { data: studentPackages } = await supabase
        .from('packages')
        .select('id, name, student_id, total_sessions, completed_sessions, status')
        .in('student_id', studentIds);

      const packageIds = studentPackages?.map(p => p.id) || [];

      // 3. 예정된 수업 조회
      if (packageIds.length > 0) {
        const { data: childLessons } = await supabase
          .from('lessons')
          .select('id, lesson_date, start_time, end_time, package_id')
          .in('package_id', packageIds)
          .gte('lesson_date', new Date().toISOString().split('T')[0])
          .eq('attendance', 'scheduled')
          .order('lesson_date')
          .limit(5);

        const pkgMap = new Map(studentPackages?.map(p => [p.id, p.student_id]) || []);
        const studentMap = new Map(myStudents?.map(s => [s.id, s.name]) || []);

        const formattedChildLessons = childLessons?.map((l: any) => {
          const studentId = pkgMap.get(l.package_id);
          return {
            id: l.id,
            student_name: studentId ? studentMap.get(studentId) || '-' : '-',
            start_time: l.start_time || '',
            end_time: l.end_time || '',
            lesson_date: l.lesson_date || '',
          };
        }) || [];
        setChildUpcomingLessons(formattedChildLessons);

        // 4. 최근 승인된 코멘트 조회
        const { data: lessonIds } = await supabase
          .from('lessons')
          .select('id')
          .in('package_id', packageIds);

        const allLessonIds = lessonIds?.map(l => l.id) || [];

        if (allLessonIds.length > 0) {
          const { data: childComments } = await supabase
            .from('comments')
            .select('id, progress, sent_to_parent_at, lesson_id, teacher_id, profiles:teacher_id(name)')
            .eq('status', 'approved')
            .in('lesson_id', allLessonIds)
            .order('sent_to_parent_at', { ascending: false })
            .limit(5);

          const formattedChildComments = childComments?.map((c: any) => ({
            id: c.id,
            student_name: myStudents?.[0]?.name || '-',
            teacher_name: c.profiles?.name || '-',
            lesson_date: '',
            session_number: 0,
            progress: c.progress || '',
          })) || [];
          setChildRecentComments(formattedChildComments);
        } else {
          setChildRecentComments([]);
        }
      } else {
        setChildUpcomingLessons([]);
        setChildRecentComments([]);
      }

      // 5. 패키지 진행상황
      const activePackages = studentPackages?.filter(p => p.status === 'active') || [];
      setPackageProgress(activePackages);
    } catch (err) {
      console.error('Error loading parent dashboard:', err);
    }
  };

  const toggleBillable = async (lessonId: string, current: boolean) => {
    await supabase.from('lessons').update({ is_billable: !current }).eq('id', lessonId);
    setAbsentLessons(prev => prev.map(l => l.id === lessonId ? { ...l, is_billable: !current } : l));
  };

  const toggleTeacherPayable = async (lessonId: string, current: boolean) => {
    await supabase.from('lessons').update({ is_teacher_payable: !current }).eq('id', lessonId);
    setAbsentLessons(prev => prev.map(l => l.id === lessonId ? { ...l, is_teacher_payable: !current } : l));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        안녕하세요, {user?.name}님
      </h1>

      {user?.role === 'admin' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="text-gray-500 text-sm font-medium">승인 대기 중인 코멘트</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingCommentsCount}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="text-gray-500 text-sm font-medium">활성 학생</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.activeStudentsCount}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="text-gray-500 text-sm font-medium">오늘 예정 수업</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.upcomingLessonsCount}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <div className="text-gray-500 text-sm font-medium">미납 수강료</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.unpaidTuitionCount}</div>
            </div>
          </div>

          {/* Quick Actions - 수강료 처리 & 강사지급 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 수강료 처리 */}
            <div className="bg-white rounded-lg shadow border-t-4 border-orange-500">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">수강료 처리</h2>
                  <Link href="/dashboard/billing" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                    전체보기 &rarr;
                  </Link>
                </div>
                {unpaidPackages.length > 0 ? (
                  <div className="space-y-3">
                    {unpaidPackages.slice(0, 5).map(pkg => (
                      <div key={pkg.id} className="flex items-center justify-between border border-orange-100 rounded-lg p-3 bg-orange-50">
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{pkg.student_name}</div>
                          <div className="text-xs text-gray-500">{pkg.package_name} ({pkg.completed_sessions}/{pkg.total_sessions}회)</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-orange-600">${pkg.tuition_fee.toLocaleString()}</div>
                          <span className="text-xs text-red-500 font-medium">미납</span>
                        </div>
                      </div>
                    ))}
                    {unpaidPackages.length > 5 && (
                      <p className="text-xs text-gray-500 text-center">외 {unpaidPackages.length - 5}건</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm">미납 수강료가 없습니다</p>
                  </div>
                )}
              </div>
            </div>

            {/* 강사 지급 */}
            <div className="bg-white rounded-lg shadow border-t-4 border-emerald-500">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">강사 지급</h2>
                  <Link href="/dashboard/pay" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    전체보기 &rarr;
                  </Link>
                </div>
                {pendingTeacherPay.length > 0 ? (
                  <div className="space-y-3">
                    {pendingTeacherPay.map(tp => (
                      <div key={tp.teacher_id} className="flex items-center justify-between border border-emerald-100 rounded-lg p-3 bg-emerald-50">
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{tp.teacher_name}</div>
                          <div className="text-xs text-gray-500">{tp.unpaid_sessions}회 &times; ${tp.rate_per_session.toLocaleString()}/session</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-600">${tp.estimated_amount.toLocaleString()}</div>
                          <span className="text-xs text-yellow-600 font-medium">미지급</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm">미지급 건이 없습니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Comments */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">최근 코멘트 (승인 대기)</h2>
            </div>
            <div className="p-6">
              {recentComments.length > 0 ? (
                <div className="space-y-4">
                  {recentComments.map(comment => (
                    <div key={comment.id} className="border border-gray-200 rounded p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-gray-900">{comment.student_name}</div>
                          <div className="text-sm text-gray-500">선생님: {comment.teacher_name}</div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>{comment.lesson_date}</div>
                          <div>회차: {comment.session_number}</div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{comment.progress}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">코멘트가 없습니다</p>
              )}
            </div>
          </div>

          {/* Absent Lessons - Billing & Pay Management */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">결석 수업 관리</h2>
              <Link href="/dashboard/lessons?filter=absent" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                전체보기 &rarr;
              </Link>
            </div>
            <div className="p-6">
              {absentLessons.length > 0 ? (
                <div className="space-y-3">
                  {absentLessons.map(lesson => (
                    <div key={lesson.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{lesson.student_name}</div>
                          <div className="text-sm text-gray-500">{lesson.lesson_date} &middot; {lesson.session_number}회차 &middot; {lesson.teacher_name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleBillable(lesson.id, lesson.is_billable)}
                            className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                              lesson.is_billable
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            수강료 {lesson.is_billable ? '청구' : '미청구'}
                          </button>
                          <button
                            onClick={() => toggleTeacherPayable(lesson.id, lesson.is_teacher_payable)}
                            className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                              lesson.is_teacher_payable
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            강사료 {lesson.is_teacher_payable ? '지급' : '미지급'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">결석 수업이 없습니다</p>
              )}
            </div>
          </div>

          {/* Consultation Requests (상담 요청) */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">상담 요청</h2>
              <Link href="/dashboard/consultations" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                전체보기 &rarr;
              </Link>
            </div>
            <div className="p-6">
              {consultationItems.length > 0 ? (
                <div className="space-y-4">
                  {consultationItems.map(item => (
                    <div key={item.id} className="border border-indigo-100 rounded-lg p-4 bg-indigo-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-gray-900">{item.student_name} <span className="text-sm font-normal text-gray-500">({item.parent_name})</span></div>
                          <div className="text-sm font-medium text-indigo-700 mt-1">{item.subject}</div>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          {item.preferred_date && <div>희망일: {item.preferred_date}</div>}
                          {item.preferred_time && <div>{item.preferred_time}</div>}
                        </div>
                      </div>
                      {item.message && <p className="text-sm text-gray-600 line-clamp-2">{item.message}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">대기 중인 상담 요청이 없습니다</p>
              )}
            </div>
          </div>

          {/* Recent Absence Requests from Parents */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">학부모 결석 신청</h2>
            </div>
            <div className="p-6">
              {absenceRequests.length > 0 ? (
                <div className="space-y-4">
                  {absenceRequests.map(request => (
                    <div key={request.id} className="border border-gray-200 rounded p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-gray-900">{request.student_name}</div>
                          <div className="text-sm text-gray-700">{request.reason}</div>
                        </div>
                        <div className="text-right text-sm text-gray-500">{request.lesson_date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">결석 신청이 없습니다</p>
              )}
            </div>
          </div>
        </div>
      )}

      {user?.role === 'teacher' && (
        <div className="space-y-6">
          {/* Student Session Counts */}
          {studentSessionCounts.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900">학생별 수업 현황</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {studentSessionCounts.map((sc, idx) => {
                    const pct = Math.round((sc.attended / sc.total) * 100);
                    const isComplete = sc.attended >= sc.total;
                    return (
                      <div key={idx} className={`border rounded-lg p-4 ${isComplete ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">{sc.student_name}</div>
                            <div className="text-xs text-gray-500">{sc.package_name}</div>
                          </div>
                          <div className={`text-2xl font-bold ${isComplete ? 'text-green-600' : 'text-indigo-600'}`}>
                            {sc.attended}/{sc.total}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        {isComplete && (
                          <p className="text-xs text-green-600 font-medium mt-2">수업 완료</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Lessons */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">오늘의 수업</h2>
            </div>
            <div className="p-6">
              {upcomingLessons.length > 0 ? (
                <div className="space-y-3">
                  {upcomingLessons.map(lesson => (
                    <div key={lesson.id} className="flex items-center justify-between border border-gray-200 rounded p-4">
                      <div>
                        <div className="font-semibold text-gray-900">{lesson.student_name}</div>
                        <div className="text-sm text-gray-500">
                          {lesson.start_time} ~ {lesson.end_time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">오늘 예정된 수업이 없습니다</p>
              )}
            </div>
          </div>

          {/* Pending Comments to Write */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">작성해야 할 코멘트</h2>
            </div>
            <div className="p-6">
              {pendingCommentLessons.length > 0 ? (
                <div className="space-y-3">
                  {pendingCommentLessons.map(lesson => (
                    <div key={lesson.id} className="flex items-center justify-between border border-yellow-200 rounded p-4 bg-yellow-50">
                      <div>
                        <div className="font-semibold text-gray-900">{lesson.student_name}</div>
                        <div className="text-sm text-gray-500">{lesson.lesson_date}</div>
                      </div>
                      <button className="px-3 py-1 bg-yellow-600 text-white rounded text-sm">
                        작성하기
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">작성할 코멘트가 없습니다</p>
              )}
            </div>
          </div>

          {/* Pay Settlements */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">최근 정산</h2>
            </div>
            <div className="p-6">
              {paySettlements.length > 0 ? (
                <div className="space-y-3">
                  {paySettlements.map(settlement => (
                    <div key={settlement.id} className="border border-gray-200 rounded p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm text-gray-500">
                            {settlement.period_start} ~ {settlement.period_end}
                          </div>
                          <div className="text-lg font-semibold text-gray-900 mt-1">
                            ${settlement.total_amount.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {settlement.session_count}회
                          </div>
                          <div className={`text-xs font-semibold mt-1 ${
                            settlement.status === 'paid' ? 'text-green-600' :
                            settlement.status === 'confirmed' ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            {settlement.status === 'paid' ? '입금완료' :
                             settlement.status === 'confirmed' ? '확인됨' : '대기중'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">정산 기록이 없습니다</p>
              )}
            </div>
          </div>
        </div>
      )}

      {user?.role === 'parent' && (
        <div className="space-y-6">
          {/* Child's Upcoming Lessons */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">예정된 수업</h2>
            </div>
            <div className="p-6">
              {childUpcomingLessons.length > 0 ? (
                <div className="space-y-3">
                  {childUpcomingLessons.map(lesson => (
                    <div key={lesson.id} className="border border-gray-200 rounded p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-gray-900">{lesson.student_name}</div>
                          <div className="text-sm text-gray-500">
                            {lesson.lesson_date} {lesson.start_time} ~ {lesson.end_time}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">예정된 수업이 없습니다</p>
              )}
            </div>
          </div>

          {/* Child's Recent Comments */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">최근 수업 코멘트</h2>
            </div>
            <div className="p-6">
              {childRecentComments.length > 0 ? (
                <div className="space-y-4">
                  {childRecentComments.map(comment => (
                    <div key={comment.id} className="border border-gray-200 rounded p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-gray-900">{comment.teacher_name}</div>
                          <div className="text-sm text-gray-500">제{comment.session_number}회 수업</div>
                        </div>
                        <div className="text-right text-sm text-gray-500">{comment.lesson_date}</div>
                      </div>
                      <p className="text-sm text-gray-700">{comment.progress}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">코멘트가 없습니다</p>
              )}
            </div>
          </div>

          {/* Package Progress */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">패키지 진행상황</h2>
            </div>
            <div className="p-6">
              {packageProgress.length > 0 ? (
                <div className="space-y-4">
                  {packageProgress.map(pkg => {
                    const progress = (pkg.completed_sessions / pkg.total_sessions) * 100;
                    return (
                      <div key={pkg.id} className="border border-gray-200 rounded p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="font-semibold text-gray-900">{pkg.name}</div>
                          <div className="text-sm text-gray-600">
                            {pkg.completed_sessions}/{pkg.total_sessions}회
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500">패키지가 없습니다</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
