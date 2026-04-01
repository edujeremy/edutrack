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
    // 학부모 전용 필드 - 자녀 정보
    childName: '',
    childSchool: '',
    childGrade: '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })
      if (error) {
        toast.error('Google 회원가입에 실패했습니다')
        setIsGoogleLoading(false)
      }
    } catch (error) {
      console.error('Google signup error:', error)
      toast.error('Google 회원가입 중 오류가 발생했습니다')
      setIsGoogleLoading(false)
    }
  }

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

    // 학부모 역할 시 자녀 이름 필수
    if (formData.role === 'parent') {
      if (!formData.childName) {
        newErrors.childName = '자녀 이름을 입력해주세요'
      }
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
            id: data.user.id,
            name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
          toast.error('프로필 생성에 실패했습니다. 관리자에게 문의해주세요.')
          return
        }

        // 학부모인 경우: 자녀 프로필 + 학생 레코드 생성
        if (formData.role === 'parent' && formData.childName) {
          // 1. 자녀 프로필 생성 (role: student)
          const { data: childProfile, error: childProfileError } = await supabase
            .from('profiles')
            .insert({
              name: formData.childName,
              email: `${formData.childName.replace(/\s/g, '')}_${Date.now()}@student.edutrack.local`,
              role: 'student' as const,
            })
            .select()
            .single()

          if (childProfileError) {
            console.error('Child profile creation error:', childProfileError)
            // 학부모 가입은 완료 - 자녀 등록은 나중에 관리자가 할 수 있음
            toast.success('회원가입 완료! 자녀 등록은 관리자에게 문의해주세요.')
          } else if (childProfile) {
            // 2. 학생 레코드 생성
            const { error: studentError } = await supabase
              .from('students')
              .insert({
                profile_id: childProfile.id,
                school: formData.childSchool || null,
                grade: formData.childGrade ? parseInt(formData.childGrade) : null,
                parent_name: formData.fullName,
                parent_phone: formData.phone,
                parent_email: formData.email,
                enrollment_date: new Date().toISOString().split('T')[0],
                status: 'active',
              })

            if (studentError) {
              console.error('Student record creation error:', studentError)
            }
          }
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
            {/* 역할 선택 - 맨 위에 배치 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                가입 유형
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'teacher' })}
                  className={`px-4 py-3 rounded-lg border-2 text-center transition-all ${
                    formData.role === 'teacher'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="block text-lg mb-1">👨‍🏫</span>
                  선생님
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'parent' })}
                  className={`px-4 py-3 rounded-lg border-2 text-center transition-all ${
                    formData.role === 'parent'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="block text-lg mb-1">👨‍👧</span>
                  학부모
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                관리자 계정은 관리자가 직접 생성합니다
              </p>
            </div>

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

            {/* 학부모 전용: 자녀 정보 섹션 */}
            {formData.role === 'parent' && (
              <div className="border-t pt-4 mt-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-800">자녀 정보</h3>

                <Input
                  label="자녀 이름 *"
                  type="text"
                  placeholder="홍길순"
                  value={formData.childName}
                  onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                  error={errors.childName}
                  disabled={isLoading}
                />

                <Input
                  label="학교"
                  type="text"
                  placeholder="서울고등학교"
                  value={formData.childSchool}
                  onChange={(e) => setFormData({ ...formData, childSchool: e.target.value })}
                  disabled={isLoading}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    학년
                  </label>
                  <select
                    value={formData.childGrade}
                    onChange={(e) => setFormData({ ...formData, childGrade: e.target.value })}
                    disabled={isLoading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">선택하세요</option>
                    <option value="7">중1</option>
                    <option value="8">중2</option>
                    <option value="9">중3</option>
                    <option value="10">고1</option>
                    <option value="11">고2</option>
                    <option value="12">고3</option>
                  </select>
                </div>
              </div>
            )}

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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {isGoogleLoading ? '가입 중...' : 'Google로 회원가입'}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Google 가입 후 대시보드에서 역할과 자녀 정보를 설정할 수 있습니다
          </p>

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
