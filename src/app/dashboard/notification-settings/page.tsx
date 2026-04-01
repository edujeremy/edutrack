'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Button } from '@/components/ui/Button'
import type { Profile, NotificationSettings } from '@/lib/types'

export default function NotificationSettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Form state
  const [lessonReminder, setLessonReminder] = useState(true)
  const [reminderMinutes, setReminderMinutes] = useState(30)
  const [emailNotifications, setEmailNotifications] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        // Get current user profile
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (!profileData) return
        setProfile(profileData)

        // Get notification settings
        const { data: settingsData } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (settingsData) {
          setSettings(settingsData)
          setLessonReminder(settingsData.lesson_reminder)
          setReminderMinutes(settingsData.reminder_minutes)
          setEmailNotifications(settingsData.email_notifications)
        } else {
          // Create default settings if they don't exist
          const { data: newSettings } = await supabase
            .from('notification_settings')
            .insert([
              {
                user_id: user.id,
                lesson_reminder: true,
                reminder_minutes: 30,
                email_notifications: true,
              },
            ])
            .select()
            .maybeSingle()

          if (newSettings) {
            setSettings(newSettings)
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setSaveMessage('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (settings) {
        // Update existing settings
        const { error } = await supabase
          .from('notification_settings')
          .update({
            lesson_reminder: lessonReminder,
            reminder_minutes: reminderMinutes,
            email_notifications: emailNotifications,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)

        if (error) {
          setSaveMessage('저장에 실패했습니다')
          return
        }
      } else {
        // Create new settings
        const { error } = await supabase
          .from('notification_settings')
          .insert([
            {
              user_id: user.id,
              lesson_reminder: lessonReminder,
              reminder_minutes: reminderMinutes,
              email_notifications: emailNotifications,
            },
          ])

        if (error) {
          setSaveMessage('저장에 실패했습니다')
          return
        }
      }

      setSaveMessage('설정이 저장되었습니다')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveMessage('저장 중 오류가 발생했습니다')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Header title="알림 설정" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" label="로딩 중..." />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header title="알림 설정" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Lesson Reminder Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                수업 알림
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                예정된 수업 시간 전에 알림을 받으세요
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    수업 시간 알림 활성화
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {lessonReminder
                      ? '활성화됨'
                      : '비활성화됨'}
                  </p>
                </div>
                <button
                  onClick={() => setLessonReminder(!lessonReminder)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
                    lessonReminder ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      lessonReminder ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {lessonReminder && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    수업 전 알림 시간
                  </label>
                  <select
                    value={reminderMinutes}
                    onChange={(e) =>
                      setReminderMinutes(parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value={10}>10분 전</option>
                    <option value={15}>15분 전</option>
                    <option value={30}>30분 전</option>
                    <option value={60}>1시간 전</option>
                  </select>
                  <p className="text-xs text-gray-600 mt-2">
                    선택하신 시간 전에 알림을 받게 됩니다
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Notification Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                이메일 알림
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                중요한 소식을 이메일로 받으세요
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    이메일 알림 활성화
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {profile?.email}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {emailNotifications
                      ? '활성화됨 - 수업 피드백, 상담, 시스템 공지를 받습니다'
                      : '비활성화됨'}
                  </p>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors ${
                    emailNotifications ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      emailNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card className="bg-blue-50 border-l-4 border-blue-500">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-700">
                <strong>알림 설정:</strong> 변경사항은 자동으로 저장되지 않습니다.
                아래의 "설정 저장" 버튼을 클릭하여 변경사항을 적용해주세요.
              </p>
            </CardContent>
          </Card>

          {/* Save Message */}
          {saveMessage && (
            <div
              className={`p-3 rounded-lg text-sm ${
                saveMessage.includes('저장') && !saveMessage.includes('실패')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {saveMessage}
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? '저장 중...' : '설정 저장'}
          </Button>
        </div>
      </div>
    </div>
  )
}
