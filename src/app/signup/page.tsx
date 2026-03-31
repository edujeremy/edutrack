'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import type { Role } from '@/lib/types'
import { isValidPhoneNumber } from '@/lib/utils'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'teacher' as Role,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요'
    } else if (!formData.email.includes('@')) {
      newErrors.email = '유효한 이메일을 입력해주세요'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요'
    } else if (formData.password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다'
    }

    if (!formData.fullName) {
      newErrors.fullName = '이름을 입력해주세요'
    }

    if (!formData.phone) {
      newErrors.phone = '휴대폰번호를 입력해주세요'
    } else if (!isValidPhoneNumber(formData.phone)) {
      newErrors.phone = '유효한 휴대폰번호를 입력해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            role: formData.role,
          },
        },
      })

      if (error) {
        toast.error(error.message || '회원가입에 실패했습니다')
        return
      }

      // Create profile in profiles table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }
      }

      setIsVerifying(true)
      toast.success('회원가입이 완료되었습니다. 이메일을 확인해주세요.')
    } catch (error) {
      console.error('Signup error:', error)
      toast.error('회원가입 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">회원가입 완료</h2>
              <p className="text-gray-600">
                가입하신 이메일로 인증 링크가 발송되었습니다.
                <br />
                이메일을 확인하고 인증을 완료해주세요.
              </p>
              <div className="pt-4">
                <Link href="/login">
                  <Button variant="primary" className="w-full">
                    로그인 페이지로 돌아가기
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center border-b-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-indigo-600">EduTrack</h1>
            <p className="text-sm text-gray-600 mt-2">회원가입</p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="이메일"
              type="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              disabled={isLoading}
            />

            <Input
              label="비밀번호"
              type="password"
              placeholder="••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              disabled={isLoading}
              helperText="최소 6자 이상"
            />

            <Input
              label="이름"
              type="text"
              placeholder="홍길동"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              error={errors.fullName}
              disabled={isLoading}
            />

            <Input
              label="휴대폰번호"
              type="tel"
              placeholder="010-1234-5678"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              error={errors.phone}
              disabled={isLoading}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                역할
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="teacher">선생님</option>
                <option value="parent">학부모</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                관리자 계정은 관리자가 직접 생성합니다
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              회원가입
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link
                href="/login"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                로그인
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
