'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Plus, Edit2, Trash2, X } from 'lucide-react';

interface Teacher {
  id: string;
  profile_id: string;
  name: string;
  email: string;
  per_session_rate: number;
  settlement_cycle: string;
  bank_info: string;
  notes: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

interface FormData {
  per_session_rate: string;
  settlement_cycle: string;
  bank_info: string;
  notes: string;
}

export default function TeachersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    per_session_rate: '',
    settlement_cycle: 'monthly',
    bank_info: '',
    notes: '',
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

        // Fetch teachers with their profile info
        const { data: teachersData, error: teachersError } = await supabase
          .from('teachers')
          .select('*, profiles(name, email)')
          .order('profiles(name)');

        if (teachersError) throw teachersError;

        const formattedTeachers = teachersData?.map((t: any) => ({
          id: t.id,
          profile_id: t.profile_id,
          name: t.profiles?.name || 'Unknown',
          email: t.profiles?.email || '',
          per_session_rate: t.per_session_rate || 0,
          settlement_cycle: t.settlement_cycle || 'monthly',
          bank_info: t.bank_info || '',
          notes: t.notes || '',
        })) || [];

        setTeachers(formattedTeachers);

        // Fetch all profiles with role 'teacher'
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'teacher')
          .order('name');

        if (profilesError) throw profilesError;
        setProfiles(profilesData || []);
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
      per_session_rate: '',
      settlement_cycle: 'monthly',
      bank_info: '',
      notes: '',
    });
    setSelectedProfileId('');
    setEditingId(null);
  };

  const handleAddClick = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditClick = (teacher: Teacher) => {
    setSelectedProfileId(teacher.profile_id);
    setFormData({
      per_session_rate: String(teacher.per_session_rate),
      settlement_cycle: teacher.settlement_cycle,
      bank_info: teacher.bank_info,
      notes: teacher.notes,
    });
    setEditingId(teacher.id);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.per_session_rate) {
        setError('수업료를 입력해주세요');
        return;
      }

      if (!editingId && !selectedProfileId) {
        setError('선생님을 선택해주세요');
        return;
      }

      setProcessingId(editingId || 'new');

      if (editingId) {
        // Update existing teacher
        const { error: updateError } = await supabase
          .from('teachers')
          .update({
            per_session_rate: parseFloat(formData.per_session_rate),
            settlement_cycle: formData.settlement_cycle,
            bank_info: formData.bank_info,
            notes: formData.notes,
          })
          .eq('id', editingId);

        if (updateError) throw updateError;

        const selectedProfile = profiles.find(p => p.id === selectedProfileId);
        setTeachers(prev =>
          prev.map(t =>
            t.id === editingId
              ? {
                  ...t,
                  per_session_rate: parseFloat(formData.per_session_rate),
                  settlement_cycle: formData.settlement_cycle,
                  bank_info: formData.bank_info,
                  notes: formData.notes,
                }
              : t
          )
        );
      } else {
        // Check if teacher already exists
        const existingTeacher = teachers.find(t => t.profile_id === selectedProfileId);
        if (existingTeacher) {
          setError('이미 등록된 선생님입니다');
          setProcessingId(null);
          return;
        }

        // Create new teacher record
        const { data: newTeacher, error: insertError } = await supabase
          .from('teachers')
          .insert([
            {
              profile_id: selectedProfileId,
              per_session_rate: parseFloat(formData.per_session_rate),
              settlement_cycle: formData.settlement_cycle,
              bank_info: formData.bank_info,
              notes: formData.notes,
            },
          ])
          .select();

        if (insertError) throw insertError;

        if (newTeacher && newTeacher.length > 0) {
          const selectedProfile = profiles.find(p => p.id === selectedProfileId);
          const newTeacherData: Teacher = {
            id: newTeacher[0].id,
            profile_id: newTeacher[0].profile_id,
            name: selectedProfile?.name || 'Unknown',
            email: selectedProfile?.email || '',
            per_session_rate: newTeacher[0].per_session_rate,
            settlement_cycle: newTeacher[0].settlement_cycle,
            bank_info: newTeacher[0].bank_info,
            notes: newTeacher[0].notes,
          };
          setTeachers(prev => [...prev, newTeacherData]);
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

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      setProcessingId(id);
      const { error: deleteError } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setTeachers(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError('삭제 중 오류가 발생했습니다');
      console.error(err);
    } finally {
      setProcessingId(null);
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
          <h1 className="text-3xl font-bold text-gray-900">선생님 관리</h1>
          <p className="text-gray-600 mt-2">선생님 정보 및 수업료를 관리합니다</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          선생님 추가
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Teachers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {teachers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">이름</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">이메일</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">수업료</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">정산 주기</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">은행 정보</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">작업</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(teacher => (
                  <tr key={teacher.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{teacher.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{teacher.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      ₩{teacher.per_session_rate.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {teacher.settlement_cycle === 'monthly' ? '월간' : '기타'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {teacher.bank_info || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(teacher)}
                          disabled={processingId === teacher.id}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded disabled:text-gray-400"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.id)}
                          disabled={processingId === teacher.id}
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
            <p className="text-gray-500 text-lg">선생님이 없습니다</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? '선생님 정보 수정' : '선생님 추가'}
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
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    선생님 선택 *
                  </label>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">선생님을 선택해주세요</option>
                    {profiles
                      .filter(p => !teachers.find(t => t.profile_id === p.id))
                      .map(profile => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    선생님
                  </label>
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-900 font-medium">
                    {teachers.find(t => t.id === editingId)?.name}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수업료 (₩) *
                </label>
                <input
                  type="number"
                  value={formData.per_session_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, per_session_rate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  정산 주기
                </label>
                <select
                  value={formData.settlement_cycle}
                  onChange={(e) => setFormData(prev => ({ ...prev, settlement_cycle: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="monthly">월간</option>
                  <option value="bi-weekly">2주</option>
                  <option value="weekly">주간</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  은행 정보
                </label>
                <input
                  type="text"
                  value={formData.bank_info}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_info: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="국민은행 123-456-789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비고
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="추가 정보"
                  rows={3}
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
    </div>
  );
}
