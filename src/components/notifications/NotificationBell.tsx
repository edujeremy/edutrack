'use client'

import { Notification } from '@/lib/types'
import { Bell, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { NotificationList } from './NotificationList'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const unreadCount = notifications.filter((n) => !n.read).length

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?unread_only=false')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.slice(0, 5))
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">알림</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-gray-500">로딩 중...</div>
              </div>
            ) : (
              <NotificationList
                notifications={notifications}
                onNotificationRead={handleNotificationRead}
              />
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <Link
                href="/dashboard/notifications"
                className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                모두 보기
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
