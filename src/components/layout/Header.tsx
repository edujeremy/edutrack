'use client'

import React from 'react'
import { Menu } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface HeaderProps {
  title: string
  onMenuClick?: () => void
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onMenuClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

        <div className="flex items-center gap-4">
          {/* Notification Bell with dropdown */}
          <NotificationBell />

          {/* Mobile Menu Button */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
            >
              <Menu size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
