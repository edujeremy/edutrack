import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        // Google OAuth 사용자의 프로필 자동 생성
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // 프로필이 이미 존재하는지 확인
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle()

          if (!existingProfile) {
            // Google 메타데이터에서 정보 추출
            const metadata = user.user_metadata
            let name = metadata?.full_name || metadata?.name || user.email?.split('@')[0] || '사용자'
            // Sanitize: trim whitespace and limit to 100 chars
            name = name.trim().substring(0, 100)

            let email = user.email || ''
            email = email.trim()

            const phone = metadata?.phone || ''
            const role = metadata?.role || 'parent' // Google 가입 기본 역할: 학부모

            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                name,
                email,
                phone,
                role,
              })

            if (profileError) {
              console.error('OAuth profile creation error:', profileError)
              // 프로필 생성 실패 시 로그인 페이지로 리다이렉트
              return NextResponse.redirect(new URL('/login?error=profile-creation-failed', request.url))
            }
          }
        }

        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(new URL('/login?error=auth-error', request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth-code-error', request.url))
}
