'use client';

import { useEffect, useState } from 'react';
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

interface UpcomingLesson {
  id: string;
  student_name: string;
  start_time: string;
  end_time: string;
  lesson_date: string;
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

  // Teacher data
  const [upcomingLessons, setUpcomingLessons] = useState<UpcomingLesson[]>([]);
  const [pendingCommentLessons, setPendingCommentLessons] = useState<UpcomingLesson[]>([]);
  const [paySettlements, setPaySettlements] = useState<PaySettlement[]>([]);

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

        if (profileData.role === 'admin') {
          await loadAdminDashboard();
        } else if (profileData.role === 'teacher') {
          await loadTeacherDashboard(sessionData.session.user.id);
        } else if (profileData.role === 'parent') {
          await loadParentDashboard(sessionData.session.user.id);
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
    } catch (err) {
      console.error('Error loading teacher dashboard:', err);
    }
  };

  const loadParentDashboard = async (parentId: string) => {
    try {
      // Get child's upcoming lessons
      const { data: childLessons } = await supabase
        .from('lessons')
        .select(
          `
          id,
          lesson_date,
          start_time,
          end_time,
          packages(students(name), students(id))
        `
        )
        .eq('packages.student_id', parentId)
        .gte('lesson_date', new Date().toISOString().split('T')[0])
        .eq('attendance', 'scheduled')
        .order('lesson_date')
        .limit(5);

      const formattedChildLessons = childLessons?.map((l: any) => ({
        id: l.id,
        student_name: l.packages?.students?.name || 'Unknown',
        start_time: l.start_time || '',
        end_time: l.end_time || '',
        lesson_date: l.lesson_date || '',
      })) || [];
      setChildUpcomingLessons(formattedChildLessons);

      // Get child's recent approved comments
      const { data: childComments } = await supabase
        .from('comments')
        .select(
          `
          id,
          progress,
          sent_to_parent_at,
          lessons(lesson_date, session_number, packages(students(name))),
          profiles(name)
        `
        )
        .eq('status', 'approved')
        .eq('lessons.packages.student_id', parentId)
        .order('sent_to_parent_at', { ascending: false })
        .limit(5);

      const formattedChildComments = childComments?.map((c: any) => ({
        id: c.id,
        student_name: c.lessons?.packages?.students?.name || 'Unknown',
        teacher_name: c.profiles?.name || 'Unknown',
        lesson_date: c.lessons?.lesson_date || '',
        session_number: c.lessons?.session_number || 0,
        progress: c.progress || '',
      })) || [];
      setChildRecentComments(formattedChildComments);

      // Get package progress
      const { data: packages } = await supabase
        .from('packages')
        .select('*')
        .eq('student_id', parentId)
        .eq('status', 'active');

      setPackageProgress(packages || []);
    } catch (err) {
      console.error('Error loading parent dashboard:', err);
    }
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
              <div className="text-gray-500 text-sm font-medium">미납 등록금</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.unpaidTuitionCount}</div>
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

          {/* Recent Absence Requests */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">최근 결석 요청</h2>
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
                <p className="text-gray-500">결석 요청이 없습니다</p>
              )}
            </div>
          </div>
        </div>
      )}

      {user?.role === 'teacher' && (
        <div className="space-y-6">
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
                            ₩{settlement.total_amount.toLocaleString()}
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
