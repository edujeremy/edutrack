'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  CreditCard,
  Settings,
  LogOut,
  Users,
  UserCheck,
  Package,
  ClipboardCheck,
  DollarSign,
  Phone,
  FileText,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Role } from '@/lib/types'
import { getRoleLabel } from '@/lib/utils'

interface SidebarProps {
  role: Role
  userName: string
  onLogout: () => Promise<void>
  isOpen?: boolean
  onClose?: () => void
}

const navItems: Record<Role, Array<{ icon: React.ReactNode; label: string; href: string }>> = {
  admin: [
    { icon: <LayoutDashboard size={20} />, label: '대시보드', href: '/dashboard' },
    { icon: <ClipboardCheck size={20} />, label: '코멘트 관리', href: '/dashboard/comments' },
    { icon: <Users size={20} />, label: '학생 관리', href: '/dashboard/students' },
    { icon: <UserCheck size={20} />, label: '선생님 관리', href: '/dashboard/teachers' },
    { icon: <Package size={20} />, label: '수강 패키지', href: '/dashboard/packages' },
    { icon: <Calendar size={20} />, label: '수업 일정', href: '/dashboard/lessons' },
    { icon: <DollarSign size={20} />, label: '선생님 페이', href: '/dashboard/pay' },
    { icon: <CreditCard size={20} />, label: '수강료 관리', href: '/dashboard/billing' },
    { icon: <Phone size={20} />, label: '상담 요청', href: '/dashboard/consultations' },
    { icon: <FileText size={20} />, label: 'CSV 내보내기', href: '/dashboard/export' },
    { icon: <Settings size={20} />, label: '설정', href: '/dashboard/settings' },
  ],
  teacher: [
    { icon: <LayoutDashboard size={20} />, label: '대시보드', href: '/dashboard' },
    { icon: <Calendar size={20} />, label: '내 수업', href: '/dashboard/my-lessons' },
    { icon: <MessageSquare size={20} />, label: '코멘트 작성', href: '/dashboard/my-comments' },
    { icon: <DollarSign size={20} />, label: '페이 확인', href: '/dashboard/my-pay' },
  ],
  parent: [
    { icon: <LayoutDashboard size={20} />, label: '대시보드', href: '/dashboard' },
    { icon: <Calendar size={20} />, label: '수업 캘린더', href: '/dashboard/calendar' },
    { icon: <MessageSquare size={20} />, label: '수업 코멘트', href: '/dashboard/my-comments' },
    { icon: <Phone size={20} />, label: '상담 요청', href: '/dashboard/consultation-request' },
    { icon: <Settings size={20} />, label: '알림 설정', href: '/dashboard/notification-settings' },
  ],
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  userName,
  onLogout,
  isOpen = true,
  onClose,
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const items = navItems[role] || navItems.parent

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await onLogout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="px-6 py-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-indigo-600">GCY EDU</h1>
          <p className="text-sm text-gray-600 mt-1">학원 관리 시스템</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-indigo-50 text-indigo-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-gray-200 px-4 py-4 space-y-3">
          <div className="px-3 py-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900">{userName}</p>
            <Badge variant="info" className="mt-2">
              {getRoleLabel(role)}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleLogout}
            isLoading={isLoggingOut}
          >
            <LogOut size={18} className="mr-2" />
            로그아웃
          </Button>
        </div>
      </aside>
    </>
  )
}
