'use client'

import { Notification } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AlertCircle, CheckCircle, Info, AlertTriangle, Clock } from 'lucide-react'

interface NotificationListProps {
  notifications: Notification[]
  onNotificationRead?: (id: string) => void
}

function getRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return '방금 전'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}일 전`

  return then.toLocaleDateString('ko-KR')
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-500" />
    default:
      return <Info className="h-5 w-5 text-blue-500" />
  }
}

function getNotificationBgColor(type: string, read: boolean) {
  if (read) return 'bg-white hover:bg-gray-50'

  switch (type) {
    case 'success':
      return 'bg-green-50 hover:bg-green-100'
    case 'warning':
      return 'bg-yellow-50 hover:bg-yellow-100'
    case 'error':
      return 'bg-red-50 hover:bg-red-100'
    default:
      return 'bg-blue-50 hover:bg-blue-100'
  }
}

export function NotificationList({
  notifications,
  onNotificationRead,
}: NotificationListProps) {
  const router = useRouter()
  const [readingId, setReadingId] = useState<string | null>(null)

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Clock className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-gray-500 text-center">
          알림이 없습니다.
        </p>
      </div>
    )
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      setReadingId(notification.id)
      try {
        const response = await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'PATCH',
        })

        if (response.ok) {
          onNotificationRead?.(notification.id)
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      } finally {
        setReadingId(null)
      }
    }

    if (notification.action_url && typeof notification.action_url === 'string') {
      router.push(notification.action_url)
    }
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          onClick={() => handleNotificationClick(notification)}
          className={`p-4 rounded-lg border border-gray-200 transition-all cursor-pointer ${getNotificationBgColor(
            notification.type,
            notification.read
          )}`}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-semibold ${
                notification.read ? 'text-gray-600' : 'text-gray-900'
              }`}>
                {notification.title}
              </h3>
              <p className={`text-sm mt-1 ${
                notification.read ? 'text-gray-500' : 'text-gray-700'
              }`}>
                {notification.message}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {getRelativeTime(notification.created_at)}
              </p>
            </div>
            {!notification.read && (
              <div className="flex-shrink-0">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
