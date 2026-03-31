'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  MessageSquare,
  BookOpen,
  Calendar,
  CreditCard,
  Settings,
  LogOut,
  ChevronDown,
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
    { icon: <Users size={20} />, label: '학생관리', href: '/dashboard/students' },
    { icon: <UserCheck size={20} />, label: '선생님관리', href: '/dashboard/teachers' },
    { icon: <MessageSquare size={20} />, label: '상담기록', href: '/dashboard/consultations' },
    { icon: <BookOpen size={20} />, label: '지원현황', href: '/dashboard/applications' },
    { icon: <Calendar size={20} />, label: '수업일정', href: '/dashboard/schedules' },
    { icon: <CreditCard size={20} />, label: '결제관리', href: '/dashboard/payments' },
    { icon: <Settings size={20} />, label: '설정', href: '/dashboard/settings' },
  ],
  manager: [
    { icon: <LayoutDashboard size={20} />, label: '대시보드', href: '/dashboard' },
    { icon: <Users size={20} />, label: '학생관리', href: '/dashboard/students' },
    { icon: <MessageSquare size={20} />, label: '상담기록', href: '/dashboard/consultations' },
    { icon: <BookOpen size={20} />, label: '지원현황', href: '/dashboard/applications' },
    { icon: <Calendar size={20} />, label: '수업일정', href: '/dashboard/schedules' },
  ],
  teacher: [
    { icon: <LayoutDashboard size={20} />, label: '대시보드', href: '/dashboard' },
    { icon: <Users size={20} />, label: '내 학생', href: '/dashboard/my-students' },
    { icon: <MessageSquare size={20} />, label: '상담기록', href: '/dashboard/consultations' },
    { icon: <BookOpen size={20} />, label: '지원현황', href: '/dashboard/applications' },
    { icon: <Calendar size={20} />, label: '수업일정', href: '/dashboard/schedules' },
  ],
  parent: [
    { icon: <LayoutDashboard size={20} />, label: '대시보드', href: '/dashboard' },
    { icon: <Users size={20} />, label: '내 자녀', href: '/dashboard/my-child' },
    { icon: <MessageSquare size={20} />, label: '상담기록', href: '/dashboard/consultations' },
    { icon: <BookOpen size={20} />, label: '지원현황', href: '/dashboard/applications' },
  ],
  student: [
    { icon: <LayoutDashboard size={20} />, label: '대시보드', href: '/dashboard' },
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

  const items = navItems[role] || []

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
          <h1 className="text-2xl font-bold text-indigo-600">EduTrack</h1>
          <p className="text-sm text-gray-600 mt-1">입시 컨설팅 관리</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
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
              <span>{item.label}</span>
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
