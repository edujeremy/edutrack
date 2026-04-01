'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, X } from 'lucide-react';

interface Comment {
  id: string;
  student_name: string;
  teacher_name: string;
  lesson_date: string;
  session_number: number;
  progress: string;
  homework_evaluation: string;
  strengths: string;
  improvements: string;
  homework: string;
  status: 'submitted' | 'approved' | 'rejected';
  lesson_id: string;
  teacher_id: string;
}

export default function CommentsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processingCommentId, setProcessingCommentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const { data: commentsData, error: fetchError } = await supabase
          .from('comments')
          .select(
            `
            id,
            progress,
            homework_evaluation,
            strengths,
            improvements,
            homework,
            status,
            lesson_id,
            teacher_id,
            lessons(session_number, lesson_date, packages(students(name))),
            profiles(name)
          `
          )
          .order('status', { ascending: false })
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const formattedComments = commentsData?.map((c: any) => ({
          id: c.id,
          student_name: c.lessons?.packages?.students?.name || 'Unknown',
          teacher_name: c.profiles?.name || 'Unknown',
          lesson_date: c.lessons?.lesson_date || '',
          session_number: c.lessons?.session_number || 0,
          progress: c.progress || '',
          homework_evaluation: c.homework_evaluation || '',
          strengths: c.strengths || '',
          improvements: c.improvements || '',
          homework: c.homework || '',
          status: c.status,
          lesson_id: c.lesson_id,
          teacher_id: c.teacher_id,
        })) || [];
        setComments(formattedComments);
      } catch (err) {
        setError('코멘트를 불러올 수 없습니다');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [supabase]);

  const handleApprove = async (commentId: string) => {
    try {
      setProcessingCommentId(commentId);
      const { error: updateError } = await supabase
        .from('comments')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (updateError) throw updateError;

      setComments(prev =>
        prev.map(c =>
          c.id === commentId ? { ...c, status: 'approved' } : c
        )
      );
      setSelectedComment(null);
    } catch (err) {
      setError('승인 중 오류가 발생했습니다');
      console.error(err);
    } finally {
      setProcessingCommentId(null);
    }
  };

  const handleRejectClick = (comment: Comment) => {
    setSelectedComment(comment);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedComment || !rejectionReason.trim()) return;

    try {
      setProcessingCommentId(selectedComment.id);
      const { error: updateError } = await supabase
        .from('comments')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedComment.id);

      if (updateError) throw updateError;

      setComments(prev =>
        prev.map(c =>
          c.id === selectedComment.id ? { ...c, status: 'rejected' } : c
        )
      );
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedComment(null);
    } catch (err) {
      setError('거절 중 오류가 발생했습니다');
      console.error(err);
    } finally {
      setProcessingCommentId(null);
    }
  };

  const groupedComments = {
    submitted: comments.filter(c => c.status === 'submitted'),
    approved: comments.filter(c => c.status === 'approved'),
    rejected: comments.filter(c => c.status === 'rejected'),
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">코멘트 관리</h1>
        <p className="text-gray-600 mt-2">학생들의 수업 피드백을 검토하고 승인합니다</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Submitted Comments */}
      {groupedComments.submitted.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            승인 대기 ({groupedComments.submitted.length})
          </h2>
          <div className="space-y-4">
            {groupedComments.submitted.map(comment => (
              <div key={comment.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-600">학생</div>
                    <div className="text-lg font-semibold text-gray-900">{comment.student_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">선생님</div>
                    <div className="text-lg font-semibold text-gray-900">{comment.teacher_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">수업 날짜</div>
                    <div className="text-lg font-semibold text-gray-900">{comment.lesson_date}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">회차</div>
                    <div className="text-lg font-semibold text-gray-900">제 {comment.session_number} 회</div>
                  </div>
                </div>

                <div className="space-y-3 mb-4 border-t border-gray-200 pt-4">
                  {comment.progress && (
                    <div>
                      <div className="text-sm font-medium text-gray-700">진행 상황</div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{comment.progress}</p>
                    </div>
                  )}
                  {comment.homework_evaluation && (
                    <div>
                      <div className="text-sm font-medium text-gray-700">숙제 평가</div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{comment.homework_evaluation}</p>
                    </div>
                  )}
                  {comment.strengths && (
                    <div>
                      <div className="text-sm font-medium text-gray-700">강점</div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{comment.strengths}</p>
                    </div>
                  )}
                  {comment.improvements && (
                    <div>
                      <div className="text-sm font-medium text-gray-700">개선 사항</div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{comment.improvements}</p>
                    </div>
                  )}
                  {comment.homework && (
                    <div>
                      <div className="text-sm font-medium text-gray-700">숙제</div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{comment.homework}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(comment.id)}
                    disabled={processingCommentId === comment.id}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-400"
                  >
                    {processingCommentId === comment.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> 처리 중...
                      </span>
                    ) : (
                      '승인'
                    )}
                  </button>
                  <button
                    onClick={() => handleRejectClick(comment)}
                    disabled={processingCommentId === comment.id}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:bg-gray-400"
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Comments */}
      {groupedComments.approved.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            승인됨 ({groupedComments.approved.length})
          </h2>
          <div className="space-y-4">
            {groupedComments.approved.map(comment => (
              <div key={comment.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">학생</div>
                    <div className="font-semibold text-gray-900">{comment.student_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">선생님</div>
                    <div className="font-semibold text-gray-900">{comment.teacher_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">수업 날짜</div>
                    <div className="font-semibold text-gray-900">{comment.lesson_date}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">회차</div>
                    <div className="font-semibold text-gray-900">제 {comment.session_number} 회</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Comments */}
      {groupedComments.rejected.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            거절됨 ({groupedComments.rejected.length})
          </h2>
          <div className="space-y-4">
            {groupedComments.rejected.map(comment => (
              <div key={comment.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">학생</div>
                    <div className="font-semibold text-gray-900">{comment.student_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">선생님</div>
                    <div className="font-semibold text-gray-900">{comment.teacher_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">수업 날짜</div>
                    <div className="font-semibold text-gray-900">{comment.lesson_date}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">회차</div>
                    <div className="font-semibold text-gray-900">제 {comment.session_number} 회</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {comments.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 text-lg">아직 코멘트가 없습니다</p>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">코멘트 거절</h3>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedComment(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {selectedComment.student_name}의 코멘트를 거절하는 이유를 입력해주세요
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="거절 사유를 입력하세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={4}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedComment(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectionReason.trim() || processingCommentId === selectedComment.id}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:bg-gray-400"
              >
                {processingCommentId === selectedComment.id ? '처리 중...' : '거절'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
