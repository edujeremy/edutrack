'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { UniversityApplication } from '@/lib/types'
import { BarChart3, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react'

interface StatusSummaryProps {
  applications: UniversityApplication[]
}

export function StatusSummary({ applications }: StatusSummaryProps) {
  const statusCounts = {
    draft: applications.filter((app) => app.status === 'draft').length,
    submitted: applications.filter((app) => app.status === 'submitted').length,
    accepted: applications.filter((app) => app.status === 'accepted').length,
    rejected: applications.filter((app) => app.status === 'rejected').length,
    waitlisted: applications.filter((app) => app.status === 'waitlisted').length,
  }

  const summaryCards = [
    {
      label: '준비중',
      value: statusCounts.draft,
      icon: Clock,
      color: 'bg-gray-50 text-gray-700',
      iconColor: 'text-gray-500',
    },
    {
      label: '제출완료',
      value: statusCounts.submitted,
      icon: BarChart3,
      color: 'bg-blue-50 text-blue-700',
      iconColor: 'text-blue-500',
    },
    {
      label: '합격',
      value: statusCounts.accepted,
      icon: CheckCircle2,
      color: 'bg-green-50 text-green-700',
      iconColor: 'text-green-500',
    },
    {
      label: '불합격',
      value: statusCounts.rejected,
      icon: XCircle,
      color: 'bg-red-50 text-red-700',
      iconColor: 'text-red-500',
    },
    {
      label: '대기중',
      value: statusCounts.waitlisted,
      icon: AlertCircle,
      color: 'bg-yellow-50 text-yellow-700',
      iconColor: 'text-yellow-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {summaryCards.map((card) => {
        const IconComponent = card.icon
        return (
          <Card key={card.label} className={card.color}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium opacity-70">{card.label}</p>
                  <p className="text-2xl font-bold mt-2">{card.value}</p>
                </div>
                <IconComponent className={`w-6 h-6 ${card.iconColor}`} />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
