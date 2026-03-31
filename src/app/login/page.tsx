'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!email) {
      newErrors.email = '이메일을 입력해주세요'
    } else if (!email.includes('@')) {
      newErrors.email = '유효한 이메일을 입력해주세요'
    }

    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요'
    } else if (password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message || '로그인에 실패했습니다')
        return
      }

      toast.success('로그인되었습니다')
      router.push('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
      toast.error('로그인 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center border-b-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-indigo-600">EduTrack</h1>
            <p className="text-sm text-gray-600 mt-2">입시 컨설팅 관리 시스템</p>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="이메일"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              disabled={isLoading}
            />

            <Input
              label="비밀번호"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              로그인
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              아직 계정이 없으신가요?{' '}
              <Link
                href="/signup"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                회원가입
              </Link>
            </p>
          </div>

          {/* Demo Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              <span className="font-semibold">테스트 계정:</span>
              <br />
              이메일: test@example.com
              <br />
              비밀번호: password123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
