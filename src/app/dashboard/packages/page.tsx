'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Plus, Edit2, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Package {
  id: string;
  name: string;
  student_name: string;
  teacher_name: string;
  total_sessions: number;
  completed_sessions: number;
  tuition_amount: number;
  tuition_status: string;
  status: string;
  schedule_days: number[];
  start_time: string;
  end_time: string;
  start_date: string;
}

interface Student {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  name: string;
  profile_id: string;
}

interface FormData {
  name: string;
  student_id: string;
  teacher_id: string;
  total_sessions: string;
  tuition_amount: string;
  billing_cycle: string;
  pay_cycle: string;
  schedule_days: boolean[];
  start_time: string;
  end_time: string;
  start_date: string;
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

export default function PackagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    student_id: '',
    teacher_id: '',
    total_sessions: '',
    tuition_amount: '',
    billing_cycle: '0',
    pay_cycle: '0',
    schedule_days: [false, false, false, false, false, false, false],
    start_time: '09:00',
    end_time: '10:00',
    start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

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

        // Fetch packages with related data
        const { data: packagesData, error: packagesError } = await supabase
          .from('packages')
          .select(
            `
            id,
            name,
            total_sessions,
            completed_sessions,
            tuition_amount,
            tuition_status,
            status,
            schedule_days,
            start_time,
            end_time,
            start_date,
            students(name),
            teachers(id, profile_id, profiles(name))
          `
          )
          .order('name');

        if (packagesError) throw packagesError;

        const formattedPackages = packagesData?.map((p: any) => ({
          id: p.id,
          name: p.name,
          student_name: p.students?.name || 'Unknown',
          teacher_name: p.teachers?.profiles?.name || 'Unknown',
          total_sessions: p.total_sessions,
          completed_sessions: p.completed_sessions,
          tuition_amount: p.tuition_amount,
          tuition_status: p.tuition_status,
          status: p.status,
          schedule_days: p.schedule_days || [],
          start_time: p.start_time,
          end_time: p.end_time,
          start_date: p.start_date,
        })) || [];

        setPackages(formattedPackages);

        // Fetch students
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, name')
          .eq('status', 'active')
          .order('name');

        if (studentsError) throw studentsError;
        setStudents(studentsData || []);

        // Fetch teachers
        const { data: teachersData, error: teachersError } = await supabase
          .from('teachers')
          .select('id, profile_id, profiles(name)')
          .order('profiles(name)');

        if (teachersError) throw teachersError;

        const formattedTeachers = teachersData?.map((t: any) => ({
          id: t.id,
          profile_id: t.profile_id,
          name: t.profiles?.name || 'Unknown',
        })) || [];

        setTeachers(formattedTeachers);
      } catch (err) {
        setError('데이터를 불러올 수 없습니다');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [supabase, router]);

  const resetForm = () => {
    setFormData({
      name: '',
      student_id: '',
      teacher_id: '',
      total_sessions: '',
      tuition_amount: '',
      billing_cycle: '0',
      pay_cycle: '0',
      schedule_days: [false, false, false, false, false, false, false],
      start_time: '09:00',
      end_time: '10:00',
      start_date: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
  };

  const handleAddClick = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditClick = (pkg: Package) => {
    setFormData({
      name: pkg.name,
      student_id: packages.find(p => p.id === pkg.id)?.student_name || '',
      teacher_id: packages.find(p => p.id === pkg.id)?.teacher_name || '',
      total_sessions: String(pkg.total_sessions),
      tuition_amount: String(pkg.tuition_amount),
      schedule_days: DAYS.map((_, idx) => pkg.schedule_days?.includes(idx) || false),
      start_time: pkg.start_time,
      end_time: pkg.end_time,
      start_date: pkg.start_date,
    });
    setEditingId(pkg.id);
    setShowAddModal(true);
  };

  const generateLessonDates = (
    startDate: string,
    scheduleDays: number[],
    totalSessions: number
  ) => {
    const dates: string[] = [];
    const start = new Date(startDate);
    let currentDate = new Date(start);
    let sessionsCreated = 0;

    while (sessionsCreated < totalSessions) {
      const dayOfWeek = currentDate.getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to 0-6 (Mon-Sun)

      if (scheduleDays.includes(adjustedDay)) {
        dates.push(currentDate.toISOString().split('T')[0]);
        sessionsCreated++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.student_id || !formData.teacher_id || !formData.total_sessions) {
        setError('필수 정보를 입력해주세요');
        return;
      }

      const scheduleDays = formData.schedule_days
        .map((selected, idx) => (selected ? idx : -1))
        .filter(idx => idx !== -1);

      if (scheduleDays.length === 0) {
        setError('수업 요일을 선택해주세요');
        return;
      }

      setProcessingId(editingId || 'new');

      if (editingId) {
        // Update existing package
        const { error: updateError } = await supabase
          .from('packages')
          .update({
            name: formData.name,
            total_sessions: parseInt(formData.total_sessions),
            tuition_amount: parseFloat(formData.tuition_amount),
            billing_cycle: parseInt(formData.billing_cycle) || 0,
            pay_cycle: parseInt(formData.pay_cycle) || 0,
            schedule_days: scheduleDays,
            start_time: formData.start_time,
            end_time: formData.end_time,
            start_date: formData.start_date,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;

        setPackages(prev =>
          prev.map(p =>
            p.id === editingId
              ? {
                  ...p,
                  name: formData.name,
                  total_sessions: parseInt(formData.total_sessions),
                  tuition_amount: parseFloat(formData.tuition_amount),
                  schedule_days: scheduleDays,
                  start_time: formData.start_time,
                  end_time: formData.end_time,
                  start_date: formData.start_date,
                }
              : p
          )
        );
      } else {
        // Get student and teacher IDs from selected values
        const studentId = formData.student_id;
        const teacherId = formData.teacher_id;

        // Create new package
        const { data: newPackage, error: insertError } = await supabase
          .from('packages')
          .insert([
            {
              name: formData.name,
              student_id: studentId,
              teacher_id: teacherId,
              total_sessions: parseInt(formData.total_sessions),
              completed_sessions: 0,
              tuition_amount: parseFloat(formData.tuition_amount),
              tuition_status: 'unpaid',
              billing_cycle: parseInt(formData.billing_cycle) || 0,
              pay_cycle: parseInt(formData.pay_cycle) || 0,
              status: 'active',
              schedule_days: scheduleDays,
              start_time: formData.start_time,
              end_time: formData.end_time,
              start_date: formData.start_date,
            },
          ])
          .select();

        if (insertError) throw insertError;

        // Generate lessons based on schedule
        if (newPackage && newPackage.length > 0) {
          const packageId = newPackage[0].id;
          const lessonDates = generateLessonDates(
            formData.start_date,
            scheduleDays,
            parseInt(formData.total_sessions)
          );

          const lessons = lessonDates.map((date, idx) => ({
            package_id: packageId,
            session_number: idx + 1,
            lesson_date: date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            attendance: 'scheduled',
            is_billable: true,
            is_teacher_payable: true,
          }));

          const { error: lessonsError } = await supabase
            .from('lessons')
            .insert(lessons);

          if (lessonsError) throw lessonsError;

          const student = students.find(s => s.id === studentId);
          const teacher = teachers.find(t => t.id === teacherId);
          const newPackageData: Package = {
            id: packageId,
            name: formData.name,
            student_name: student?.name || 'Unknown',
            teacher_name: teacher?.name || 'Unknown',
            total_sessions: parseInt(formData.total_sessions),
            completed_sessions: 0,
            tuition_amount: parseFloat(formData.tuition_amount),
            tuition_status: 'unpaid',
            status: 'active',
            schedule_days: scheduleDays,
            start_time: formData.start_time,
            end_time: formData.end_time,
            start_date: formData.start_date,
          };
          setPackages(prev => [...prev, newPackageData]);
        }
      }

      setShowAddModal(false);
      resetForm();
    } catch (err) {
      setError('저장 중 오류가 발생했습니다');
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      setProcessingId(deleteConfirm);

      // Delete related lessons first
      const { error: lessonsError } = await supabase
        .from('lessons')
        .delete()
        .eq('package_id', deleteConfirm);

      if (lessonsError) throw lessonsError;

      // Delete package
      const { error: deleteError } = await supabase
        .from('packages')
        .delete()
        .eq('id', deleteConfirm);

      if (deleteError) throw deleteError;
      setPackages(prev => prev.filter(p => p.id !== deleteConfirm));
      toast.success('패키지가 삭제되었습니다');
    } catch (err) {
      toast.error('삭제 중 오류가 발생했습니다');
      console.error(err);
    } finally {
      setProcessingId(null);
      setDeleteConfirm(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">패키지 관리</h1>
          <p className="text-gray-600 mt-2">학생 수업 패키지를 관리합니다</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          패키지 추가
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Packages Grid */}
      {packages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map(pkg => {
            const progress = (pkg.completed_sessions / pkg.total_sessions) * 100;
            return (
              <div key={pkg.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                    <p className="text-sm text-gray-600">{pkg.student_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(pkg)}
                      disabled={processingId === pkg.id}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded disabled:text-gray-400"
                      title="수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(pkg.id)}
                      disabled={processingId === pkg.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded disabled:text-gray-400"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 mb-4 border-t border-gray-200 pt-4">
                  <div>
                    <p className="text-xs text-gray-600">선생님</p>
                    <p className="font-medium text-gray-900">{pkg.teacher_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">수업 시간</p>
                    <p className="font-medium text-gray-900">
                      {pkg.start_time} ~ {pkg.end_time}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">시작일</p>
                    <p className="font-medium text-gray-900">{pkg.start_date}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-gray-600">진행 상황</p>
                    <p className="text-sm font-medium text-gray-900">
                      {pkg.completed_sessions}/{pkg.total_sessions}회
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Tuition Status */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-600">등록금</p>
                    <p className="font-medium text-gray-900">
                      ${pkg.tuition_amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">상태</p>
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      pkg.tuition_status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {pkg.tuition_status === 'paid' ? '납부' : '미납'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">패키지가 없습니다</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? '패키지 수정' : '패키지 추가'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  패키지명 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="패키지명"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  학생 *
                </label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                  disabled={!!editingId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">학생을 선택해주세요</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  선생님 *
                </label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, teacher_id: e.target.value }))}
                  disabled={!!editingId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선생님을 선택해주세요</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    총 수업 수 *
                  </label>
                  <input
                    type="number"
                    value={formData.total_sessions}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_sessions: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    수강료 ($) *
                  </label>
                  <input
                    type="number"
                    value={formData.tuition_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, tuition_amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="500"
                  />
                </div>
              </div>

              {/* Billing & Pay Cycle Settings */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-800">결제 주기 설정</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      수강료 청구 주기
                    </label>
                    <select
                      value={formData.billing_cycle}
                      onChange={(e) => setFormData(prev => ({ ...prev, billing_cycle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="0">전체 완료 후</option>
                      <option value="4">4회마다</option>
                      <option value="8">8회마다</option>
                      <option value="12">12회마다</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">학부모 수강료 납부 주기</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      강사료 지급 주기
                    </label>
                    <select
                      value={formData.pay_cycle}
                      onChange={(e) => setFormData(prev => ({ ...prev, pay_cycle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="0">전체 완료 후</option>
                      <option value="4">4회마다</option>
                      <option value="8">8회마다</option>
                      <option value="12">12회마다</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">강사 급여 지급 주기</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수업 요일 *
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((day, idx) => (
                    <label key={idx} className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={formData.schedule_days[idx]}
                        onChange={(e) => {
                          const newDays = [...formData.schedule_days];
                          newDays[idx] = e.target.checked;
                          setFormData(prev => ({ ...prev, schedule_days: newDays }));
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700 ml-1">{day}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작 시간
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료 시간
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작일 *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={processingId === (editingId || 'new')}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-400"
              >
                {processingId === (editingId || 'new') ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        title="패키지 삭제"
        message="정말 삭제하시겠습니까? 관련 수업도 함께 삭제됩니다."
        confirmText="삭제"
        variant="danger"
      />
    </div>
  );
}
