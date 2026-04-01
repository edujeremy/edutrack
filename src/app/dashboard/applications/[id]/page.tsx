import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Edit, Trash2, ArrowLeft, Calendar } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { notFound, redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusLabels: Record<string, string> = {
  draft: '준비중',
  submitted: '제출완료',
  accepted: '합격',
  rejected: '불합격',
  waitlisted: '대기중',
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  waitlisted: 'bg-yellow-100 text-yellow-800',
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: application } = await supabase
    .from('university_applications')
    .select(
      `
      *,
      student:students(id, profile:profiles(id, name, email, phone, avatar_url))
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (!application) {
    notFound()
  }

  const statusColor =
    statusColors[application.status as keyof typeof statusColors] ||
    statusColors.draft

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/applications">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">지원 현황 상세</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    {application.university_name}
                  </h2>
                  <p className="text-lg text-gray-600 mt-1">
                    {application.major}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    지원자: {application.student?.profile?.name || '학생'}
                  </p>
                </div>
                <Badge className={statusColor}>
                  {statusLabels[application.status] || application.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">지원일</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(application.application_date), 'PPP', {
                      locale: ko,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">등록일</p>
                  <p className="font-medium">
                    {format(new Date(application.created_at), 'PPP', {
                      locale: ko,
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          {application.notes && (
            <Card>
              <CardHeader>
                <CardTitle>메모</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded text-gray-700 whitespace-pre-wrap">
                  {application.notes}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents Card */}
          {application.documents && application.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>제출 서류</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {application.documents.map((doc: string, idx: number) => (
                    <li
                      key={idx}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {doc}
                    </li>
                  ))}
                </ul>
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
                  {application.student?.profile?.name || '학생'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">이메일</p>
                <p className="font-medium text-sm">
                  {application.student?.profile?.email || '-'}
                </p>
              </div>
              {application.student?.profile?.phone && (
                <div>
                  <p className="text-sm text-gray-600">전화</p>
                  <p className="font-medium">
                    {application.student?.profile?.phone}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">지원 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">현재 상태</p>
                <p className="font-medium">
                  {statusLabels[application.status] || application.status}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Link
              href={`/dashboard/applications/${id}/edit`}
              className="w-full"
            >
              <Button className="w-full" variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                편집
              </Button>
            </Link>
            <Button
              className="w-full text-red-600"
              variant="outline"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              삭제
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
