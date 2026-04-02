'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, Role } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  User,
  Lock,
  Bell,
  Loader,
  Check,
  AlertCircle,
} from 'lucide-react'

type NotificationPreference = {
  consultation_reminder: boolean
  payment_due: boolean
  new_consultation: boolean
  comment_approved: boolean
  lesson_reminder: boolean
  absence_request: boolean
  pay_settlement: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Profile form
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] =
    useState<NotificationPreference>({
      consultation_reminder: true,
      payment_due: true,
      new_consultation: true,
      comment_approved: true,
      lesson_reminder: true,
      absence_request: true,
      pay_settlement: true,
    })

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (error || !profileData) {
          setErrorMessage('프로필을 불러올 수 없습니다.')
          return
        }

        setProfile(profileData)
        setFormData({
          name: profileData.name,
          phone: profileData.phone || '',
        })

        // Load notification preferences from localStorage
        try {
          const savedPrefs = localStorage.getItem('notificationPrefs')
          if (savedPrefs) {
            setNotificationPrefs(JSON.parse(savedPrefs))
          }
        } catch {
          // Corrupted localStorage data - use defaults
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        setErrorMessage('프로필을 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone || null,
        })
        .eq('id', profile?.id)

      if (error) throw error

      setSuccessMessage('프로필이 업데이트되었습니다.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setErrorMessage('프로필 업데이트에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMessage('새 비밀번호가 일치하지 않습니다.')
      setSaving(false)
      return
    }

    if (!passwordForm.currentPassword) {
      setErrorMessage('현재 비밀번호를 입력해주세요.')
      setSaving(false)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setErrorMessage('새 비밀번호는 최소 6자 이상이어야 합니다.')
      setSaving(false)
      return
    }

    try {
      const supabase = createClient()

      // Verify current password by re-authenticating
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || !user.email) throw new Error('사용자를 찾을 수 없습니다.')

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword,
      })

      if (signInError) {
        setErrorMessage('현재 비밀번호가 올바르지 않습니다.')
        setSaving(false)
        return
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (error) throw error

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setSuccessMessage('비밀번호가 변경되었습니다.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error updating password:', error)
      setErrorMessage('비밀번호 변경에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationPreference = (key: keyof NotificationPreference) => {
    const updated = {
      ...notificationPrefs,
      [key]: !notificationPrefs[key],
    }
    setNotificationPrefs(updated)
    try {
      localStorage.setItem('notificationPrefs', JSON.stringify(updated))
    } catch {
      // localStorage unavailable or full
    }
    setSuccessMessage('알림 설정이 저장되었습니다.')
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">프로필을 불러올 수 없습니다.</p>
      </div>
    )
  }

  const notificationOptions: {
    key: keyof NotificationPreference
    label: string
    description: string
  }[] = [
    {
      key: 'consultation_reminder',
      label: '상담 일정 알림',
      description: '예정된 상담 시간 전에 알림을 받습니다.',
    },
    {
      key: 'payment_due',
      label: '등록금 납부 안내',
      description: '등록금 납부 기한이 다가오면 알림을 받습니다.',
    },
    {
      key: 'new_consultation',
      label: '새로운 상담 등록',
      description: '새로운 상담이 등록되면 알림을 받습니다.',
    },
    {
      key: 'comment_approved',
      label: '코멘트 승인 알림',
      description: '작성한 코멘트가 승인되면 알림을 받습니다.',
    },
    {
      key: 'lesson_reminder',
      label: '수업 리마인더',
      description: '예정된 수업 시간 전에 알림을 받습니다.',
    },
    {
      key: 'absence_request',
      label: '결석/변경 요청 알림',
      description: '결석이나 수업 변경 요청이 있을 때 알림을 받습니다.',
    },
    {
      key: 'pay_settlement',
      label: '정산 알림',
      description: '정산 내역이 있을 때 알림을 받습니다.',
    },
  ]

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">설정</h1>

      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <Check className="h-5 w-5" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Profile Section */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">프로필</h2>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-gray-700">
              이메일
            </Label>
            <input
              id="email"
              type="email"
              disabled
              value={profile.email}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              이메일은 변경할 수 없습니다.
            </p>
          </div>

          <div>
            <Label htmlFor="name" className="text-gray-700">
              이름
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="phone" className="text-gray-700">
              휴대폰
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="010-0000-0000"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-gray-700">역할</Label>
            <div className="mt-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600">
              {getRoleLabel(profile.role)}
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </form>
      </section>

      {/* Password Section */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">비밀번호</h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <Label htmlFor="currentPassword" className="text-gray-700">
              현재 비밀번호
            </Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  currentPassword: e.target.value,
                })
              }
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="newPassword" className="text-gray-700">
              새 비밀번호
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  newPassword: e.target.value,
                })
              }
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-gray-700">
              비밀번호 확인
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  confirmPassword: e.target.value,
                })
              }
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            disabled={
              saving ||
              !passwordForm.currentPassword ||
              !passwordForm.newPassword ||
              !passwordForm.confirmPassword
            }
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                변경 중...
              </>
            ) : (
              '비밀번호 변경'
            )}
          </Button>
        </form>
      </section>

      {/* Notification Preferences */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">알림 설정</h2>
        </div>

        <div className="space-y-4">
          {notificationOptions.map((option) => (
            <label
              key={option.key}
              className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={notificationPrefs[option.key]}
                onChange={() => handleNotificationPreference(option.key)}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{option.label}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </section>

    </div>
  )
}

function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    admin: '관리자',
    teacher: '강사',
    parent: '학부모',
  }
  return labels[role] || role
}
