'use client'

import { Consultation, Profile, Student } from '@/lib/types'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Clock, Edit, Trash2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ConsultationCardProps {
  consultation: Consultation & {
    student: { profile: Profile }
    teacher: { profile: Profile }
  }
  onDelete?: (id: string) => void
}

const consultationTypeLabels: Record<string, string> = {
  '초기상담': '초기상담',
  '정기상담': '정기상담',
  '긴급상담': '긴급상담',
  '입시전략': '입시전략',
}

const consultationTypeColors: Record<string, string> = {
  '초기상담': 'bg-blue-100 text-blue-800',
  '정기상담': 'bg-green-100 text-green-800',
  '긴급상담': 'bg-red-100 text-red-800',
  '입시전략': 'bg-purple-100 text-purple-800',
}

export function ConsultationCard({
  consultation,
  onDelete,
}: ConsultationCardProps) {
  const consultationType = consultation.topics?.[0] || '상담'
  const isCompleted = consultation.updated_at > consultation.consultation_date

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              {consultation.student.profile.name} ·{' '}
              {consultation.teacher.profile.name}
            </p>
            <h3 className="font-semibold text-lg mt-1 truncate">
              상담 기록
            </h3>
          </div>
          <Badge
            className={`whitespace-nowrap ml-2 ${
              consultationTypeColors[consultationType] ||
              'bg-gray-100 text-gray-800'
            }`}
          >
            {consultationTypeLabels[consultationType] || consultationType}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          <p className="text-sm text-gray-600 line-clamp-2">
            {consultation.notes || '상담 내용 없음'}
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            {format(new Date(consultation.consultation_date), 'PPP p', {
              locale: ko,
            })}
          </div>
          {isCompleted && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              완료됨
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Link href={`/dashboard/consultations/${consultation.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              상세보기
            </Button>
          </Link>
          <Link
            href={`/dashboard/consultations/${consultation.id}/edit`}
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full">
              <Edit className="w-4 h-4" />
            </Button>
          </Link>
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onDelete(consultation.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
