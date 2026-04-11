'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';
import { Loader2, Plus, Edit2, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Student {
  id: string;
  name: string;
  school: string;
  grade: number;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  status: 'active' | 'inactive';
  notes: string;
}

interface FormData {
  name: string;
  school: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    school: '',
    grade: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
  });

  useEffect(() => {
    const fetchStudents = async () => {
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

        const { data, error: fetchError } = await supabase
          .from('students')
          .select('*')
          .order('name');

        if (fetchError) throw fetchError;
        setStudents(data || []);
      } catch (err) {
        setError('학생 목록을 불러올 수 없습니다');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [supabase, router]);

  const filteredStudents = filter === 'all'
    ? students
    : students.filter(s => s.status === filter);

  const resetForm = () => {
    setFormData({
      name: '',
      school: '',
      grade: '',
      parent_name: '',
      parent_phone: '',
      parent_email: '',
    });
    setEditingId(null);
  };

  const handleAddClick = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditClick = (student: Student) => {
    setFormData({
      name: student.name,
      school: student.school,
      grade: String(student.grade),
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      parent_email: student.parent_email,
    });
    setEditingId(student.id);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.parent_name || !formData.parent_email) {
        setError('필수 정보를 입력해주세요');
        return;
      }

      setProcessingId(editingId || 'new');

      if (editingId) {
        // Update existing student
        const { error: updateError } = await supabase
          .from('students')
          .update({
            name: formData.name,
            school: formData.school,
            grade: parseInt(formData.grade) || 0,
            parent_name: formData.parent_name,
            parent_phone: formData.parent_phone,
            parent_email: formData.parent_email,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;

        setStudents(prev =>
          prev.map(s =>
            s.id === editingId
              ? {
                  ...s,
                  name: formData.name,
                  school: formData.school,
                  grade: parseInt(formData.grade) || 0,
                  parent_name: formData.parent_name,
                  parent_phone: formData.parent_phone,
                  parent_email: formData.parent_email,
                }
              : s
          )
        );
      } else {
        // Create new student
        const { data: newStudent, error: insertError } = await supabase
          .from('students')
          .insert([
            {
              name: formData.name,
              school: formData.school,
              grade: parseInt(formData.grade) || 0,
              parent_name: formData.parent_name,
              parent_phone: formData.parent_phone,
              parent_email: formData.parent_email,
              status: 'active',
            },
          ])
          .select();

        if (insertError) throw insertError;
        if (newStudent) {
          setStudents(prev => [...prev, ...newStudent]);
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
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', deleteConfirm);

      if (deleteError) throw deleteError;
      setStudents(prev => prev.filter(s => s.id !== deleteConfirm));
    } catch (err) {
      setError('삭제 중 오류가 발생했습니다');
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
          <h1 className="text-3xl font-bold text-gray-900">학생 관리</h1>
          <p className="text-gray-600 mt-2">모든 학생 정보를 관리합니다</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          학생 추가
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        {(['all', 'active', 'inactive'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === status
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {status === 'all' ? '전체' : status === 'active' ? '활성' : '비활성'}
          </button>
        ))}
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">이름</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">학교</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">학년</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">학부모</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">연락처</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">상태</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{student.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.school}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.grade}학년</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.parent_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.parent_phone}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        student.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {student.status === 'active' ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(student)}
                          disabled={processingId === student.id}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded disabled:text-gray-400"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(student.id)}
                          disabled={processingId === student.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded disabled:text-gray-400"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">학생이 없습니다</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? '학생 정보 수정' : '학생 추가'}
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  학생 이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="학생 이름"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    학교
                  </label>
                  <input
                    type="text"
                    value={formData.school}
                    onChange={(e) => setFormData(prev => ({ ...prev, school: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="학교"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    학년
                  </label>
                  <input
                    type="number"
                    value={formData.grade}
                    onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="학년"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  학부모 이름 *
                </label>
                <input
                  type="text"
                  value={formData.parent_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="학부모 이름"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  연락처
                </label>
                <input
                  type="tel"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="010-1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 *
                </label>
                <input
                  type="email"
                  value={formData.parent_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent_email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="example@email.com"
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
        title="학생 삭제"
        message="정말 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </div>
  );
}
