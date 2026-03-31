'use client'

import { UniversityApplication, Profile } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Edit, Eye, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ApplicationTableProps {
  applications: (UniversityApplication & {
    student: { profile: Profile }
  })[]
  onDelete?: (id: string) => void
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

export function ApplicationTable({
  applications,
  onDelete,
}: ApplicationTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>학생</TableHead>
            <TableHead>대학교</TableHead>
            <TableHead>학과</TableHead>
            <TableHead>마감일</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                지원 기록이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            applications.map((app) => (
              <TableRow key={app.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  {app.student.profile.name}
                </TableCell>
                <TableCell>{app.university_name}</TableCell>
                <TableCell>{app.major}</TableCell>
                <TableCell>
                  {format(new Date(app.application_date), 'MM/dd', {
                    locale: ko,
                  })}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[app.status] || ''}>
                    {statusLabels[app.status] || app.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/applications/${app.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/dashboard/applications/${app.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(app.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
