import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Edit, Trash2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { notFound, redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

const consultationTypeColors: Record<string, string> = {
  '초기상담': 'bg-blue-100 text-blue-800',
  '정기상담': 'bg-green-100 text-green-800',
  '긴급상담': 'bg-red-100 text-red-800',
  '입시전략': 'bg-purple-100 text-purple-800',
}

export default async function ConsultationDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: consultation } = await supabase
    .from('consultations')
    .select(
      `
      *,
      student:students(id, profile:profiles(id, name, email, avatar_url)),
      teacher:profiles(id, name, email, avatar_url)
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (!consultation) {
    notFound()
  }

  const consultationType = consultation.topics?.[0] || '상담'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/consultations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">상담 기록 상세</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    {consultation.student?.profile?.name || '학생'}님 상담
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    담당: {consultation.teacher?.name || '선생님'}
                  </p>
                </div>
                <Badge
                  className={
                    consultationTypeColors[consultationType] ||
                    'bg-gray-100 text-gray-800'
                  }
                >
                  {consultationType}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">상담 일시</p>
                  <p className="font-medium">
                    {format(
                      new Date(consultation.consultation_date),
                      'PPP p',
                      {
                        locale: ko,
                      }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">작성일</p>
                  <p className="font-medium">
                    {format(new Date(consultation.created_at), 'PPP', {
                      locale: ko,
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Card */}
          <Card>
            <CardHeader>
              <CardTitle>상담 내용</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded text-gray-700 whitespace-pre-wrap">
                {consultation.notes || '상담 내용이 없습니다.'}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps Card */}
          {consultation.next_steps && (
            <Card>
              <CardHeader>
                <CardTitle>다음 단계</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 p-4 rounded text-gray-700 whitespace-pre-wrap">
                  {consultation.next_steps}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">학생 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">이름</p>
                <p className="font-medium">
                  {consultation.student?.profile?.name || '학생'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">이메일</p>
                <p className="font-medium text-sm">
                  {consultation.student?.profile?.email || '-'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">선생님 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">이름</p>
                <p className="font-medium">{consultation.teacher?.name || '선생님'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">이메일</p>
                <p className="font-medium text-sm">
                  {consultation.teacher?.email || '-'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Link href={`/dashboard/consultations/${id}/edit`} className="w-full">
              <Button className="w-full" variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                편집
              </Button>
            </Link>
            <Button className="w-full text-red-600" variant="outline">
              <Trash2 className="w-4 h-4 mr-2" />
              삭제
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
