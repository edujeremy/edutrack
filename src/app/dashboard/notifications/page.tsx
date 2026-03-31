import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NotificationList } from '@/components/notifications/NotificationList'
import { Button } from '@/components/ui/Button'

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const params = await searchParams
  const filter = params.filter || 'all'

  const supabase = await createClient()
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (filter === 'unread') {
    query = query.eq('read', false)
  }

  const { data: notifications = [], error } = await query

  const markAllAsRead = async () => {
    'use server'

    const supabase = await createClient()
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    redirect('/dashboard/notifications')
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">알림</h1>
        {unreadCount > 0 && (
          <form action={markAllAsRead}>
            <button
              type="submit"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              모두 읽음으로 표시
            </button>
          </form>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <a
          href="/dashboard/notifications"
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          전체
        </a>
        <a
          href="/dashboard/notifications?filter=unread"
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
            filter === 'unread'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          읽지않음 ({unreadCount})
        </a>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg">
        <NotificationList notifications={notifications} />
      </div>
    </div>
  )
}
