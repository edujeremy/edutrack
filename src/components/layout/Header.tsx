'use client'

import React, { useState } from 'react'
import { Bell, Menu, X } from 'lucide-react'

interface HeaderProps {
  title: string
  unreadNotifications?: number
  onMenuClick?: () => void
}

export const Header: React.FC<HeaderProps> = ({
  title,
  unreadNotifications = 0,
  onMenuClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 inline-flex items-center justify-center h-5 w-5 bg-red-500 text-white text-xs font-semibold rounded-full">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </button>

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
