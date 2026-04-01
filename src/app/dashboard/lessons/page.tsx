'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Filter, Loader2 } from 'lucide-react';

interface Lesson {
  id: string;
  package_id: string;
  session_number: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  attendance: 'scheduled' | 'attended' | 'absent' | 'cancelled';
  absence_reason: string | null;
  is_billable: boolean;
  is_teacher_payable: boolean;
  package?: {
    name: string;
    student_id: string;
    teacher_id: string;
    students?: { name: string };
    teachers?: { profiles?: { name: string } };
  };
  comments?: { status: string }[];
}

export default function LessonsPage() {
  const supabase = createClient();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterAttendance, setFilterAttendance] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [absenceReason, setAbsenceReason] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    fetchLessons();
    fetchFilters();
  }, []);

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
    const { data, error } = await supabase
      .from('lessons')
      .select(`
        id,
        package_id,
        session_number,
        lesson_date,
        start_time,
        end_time,
        attendance,
        absence_reason,
        is_billable,
        is_teacher_payable,
        packages(
          name,
          student_id,
          teacher_id,
          students(name),
          teachers(profiles(name))
        ),
        comments(status)
      `)
      .order('lesson_date', { ascending: false });

    if (!error) {
      setLessons(data || []);
    }
    setLoading(false);
  };

  const filteredLessons = lessons.filter((lesson) => {
    if (filterDate && lesson.lesson_date !== filterDate) return false;
    if (filterStudent && lesson.package?.student_id !== filterStudent) return false;
    if (filterTeacher && lesson.package?.teacher_id !== filterTeacher) return false;
    if (filterAttendance && lesson.attendance !== filterAttendance) return false;
    return true;
  });

  const handleAttendanceChange = async (
    lessonId: string,
    newStatus: string,
  ) => {
    const updates: any = { attendance: newStatus };
    if (newStatus !== 'absent') {
      updates.absence_reason = null;
    }

    await supabase
      .from('lessons')
      .update(updates)
      .eq('id', lessonId);

    fetchLessons();
  };

  const handleAbsenceReason = async (lessonId: string) => {
    await supabase
      .from('lessons')
      .update({ absence_reason: absenceReason })
      .eq('id', lessonId);

    setSelectedLesson(null);
    setAbsenceReason('');
    fetchLessons();
  };

  const toggleBillable = async (lessonId: string, current: boolean) => {
    await supabase
      .from('lessons')
      .update({ is_billable: !current })
      .eq('id', lessonId);

    fetchLessons();
  };

  const toggleTeacherPayable = async (lessonId: string, current: boolean) => {
    await supabase
      .from('lessons')
      .update({ is_teacher_payable: !current })
      .eq('id', lessonId);

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
        <h1 className="text-3xl font-bold mb-8 text-gray-900">수업 일정</h1>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold">필터</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">날짜</label>
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
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
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
                <option value="absent">결석</option>
                <option value="cancelled">취소</option>
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
                <th className="px-4 py-3 text-left text-sm font-semibold">시간</th>
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
                    {(lesson.package?.students as any)?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {(lesson.package?.teachers as any)?.profiles?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    {lesson.session_number}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {lesson.start_time} - {lesson.end_time}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lesson.attendance}
                      onChange={(e) =>
                        handleAttendanceChange(lesson.id, e.target.value)
                      }
                      className="px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="scheduled">예정</option>
                      <option value="attended">출석</option>
                      <option value="absent">결석</option>
                      <option value="cancelled">취소</option>
                    </select>
                    {lesson.attendance === 'absent' && (
                      <div className="mt-2">
                        {selectedLesson === lesson.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={absenceReason}
                              onChange={(e) => setAbsenceReason(e.target.value)}
                              placeholder="결석 사유"
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                            <button
                              onClick={() => handleAbsenceReason(lesson.id)}
                              className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                            >
                              저장
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedLesson(lesson.id);
                              setAbsenceReason(lesson.absence_reason || '');
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {lesson.absence_reason || '사유 추가'}
                          </button>
                        )}
                      </div>
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
    </div>
  );
}
