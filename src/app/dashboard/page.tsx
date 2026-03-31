import React from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

export default function DashboardPage() {
  return (
    <div className="flex flex-col">
      <Header title="대시보드" />

      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-gray-600 text-sm font-medium mb-2">
                  전체 학생
                </p>
                <p className="text-4xl font-bold text-indigo-600">-</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-gray-600 text-sm font-medium mb-2">
                  이번달 상담
                </p>
                <p className="text-4xl font-bold text-blue-600">-</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-gray-600 text-sm font-medium mb-2">
                  대기 중인 과제
                </p>
                <p className="text-4xl font-bold text-yellow-600">-</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-gray-600 text-sm font-medium mb-2">
                  합격률
                </p>
                <p className="text-4xl font-bold text-green-600">-</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              최근 활동
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center py-8">
              아직 활동이 없습니다
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
