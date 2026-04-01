'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageSquare, Loader2, Edit2 } from 'lucide-react';

interface ConsultationRequest {
  id: string;
  parent_id: string;
  student_id: string;
  subject: string;
  message: string;
  preferred_date: string;
  preferred_time: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  admin_notes: string | null;
  profiles?: { name: string };
  students?: { name: string };
}

export default function ConsultationsPage() {
  const supabase = createClient();
  const [consultations, setConsultations] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [newStatus, setNewStatus] = useState<
    'pending' | 'scheduled' | 'completed' | 'cancelled'
  >('pending');

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('consultation_requests')
      .select(`
        id,
        parent_id,
        student_id,
        subject,
        message,
        preferred_date,
        preferred_time,
        status,
        admin_notes,
        profiles(name),
        students(name)
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setConsultations(data || []);
    }
    setLoading(false);
  };

  const handleOpenEdit = (consultation: ConsultationRequest) => {
    setSelectedId(consultation.id);
    setEditingNotes(consultation.admin_notes || '');
    setNewStatus(consultation.status);
  };

  const handleSave = async () => {
    if (!selectedId) return;

    const { error } = await supabase
      .from('consultation_requests')
      .update({
        status: newStatus,
        admin_notes: editingNotes,
      })
      .eq('id', selectedId);

    if (!error) {
      setSelectedId(null);
      setEditingNotes('');
      fetchConsultations();
    } else {
      alert('저장 중 오류가 발생했습니다');
    }
  };

  const getStatusColor = (
    status: 'pending' | 'scheduled' | 'completed' | 'cancelled',
  ) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (
    status: 'pending' | 'scheduled' | 'completed' | 'cancelled',
  ) => {
    switch (status) {
      case 'pending':
        return '대기중';
      case 'scheduled':
        return '예약됨';
      case 'completed':
        return '완료';
      case 'cancelled':
        return '취소됨';
      default:
        return '';
    }
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
        <h1 className="text-3xl font-bold mb-8 text-gray-900">상담 요청 처리</h1>

        {/* Consultations List */}
        <div className="space-y-4">
          {consultations.map((consultation) => (
            <div key={consultation.id} className="bg-white p-6 rounded-lg shadow">
              {selectedId === consultation.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">보호자</p>
                      <p className="font-medium">
                        {(consultation.profiles as any)?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">학생</p>
                      <p className="font-medium">
                        {(consultation.students as any)?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">희망 날짜</p>
                      <p className="font-medium">{consultation.preferred_date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">희망 시간</p>
                      <p className="font-medium">{consultation.preferred_time}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">주제</p>
                    <p className="font-medium">{consultation.subject}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">메시지</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {consultation.message}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">상태</label>
                    <select
                      value={newStatus}
                      onChange={(e) =>
                        setNewStatus(
                          e.target.value as
                            | 'pending'
                            | 'scheduled'
                            | 'completed'
                            | 'cancelled',
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="pending">대기중</option>
                      <option value="scheduled">예약됨</option>
                      <option value="completed">완료</option>
                      <option value="cancelled">취소됨</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      관리자 메모
                    </label>
                    <textarea
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="상담 결과, 조치 사항 등을 기록하세요"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setSelectedId(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                      <div>
                        <p className="text-sm text-gray-600">보호자</p>
                        <p className="font-medium">
                          {(consultation.profiles as any)?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">학생</p>
                        <p className="font-medium">
                          {(consultation.students as any)?.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">희망 날짜/시간</p>
                        <p className="font-medium">
                          {consultation.preferred_date} {consultation.preferred_time}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">상태</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            consultation.status,
                          )}`}
                        >
                          {getStatusLabel(consultation.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">주제</p>
                    <p className="font-medium">{consultation.subject}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">메시지</p>
                    <p className="text-sm text-gray-700">{consultation.message}</p>
                  </div>

                  {consultation.admin_notes && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">관리자 메모</p>
                      <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                        {consultation.admin_notes}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => handleOpenEdit(consultation)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Edit2 size={16} />
                    처리
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          총 {consultations.length}개 상담 요청
        </div>
      </div>
    </div>
  );
}
