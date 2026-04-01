import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '인증되지 않았습니다.' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unread_only') === 'true'

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: '알림을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '인증되지 않았습니다.' }, { status: 401 })
    }

    const body = await request.json()
    let { title, message, type = 'info', action_url } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: '제목과 메시지는 필수입니다.' },
        { status: 400 }
      )
    }

    // Validate action_url: only allow internal routes (starting with /)
    if (action_url) {
      if (action_url.includes('http://') || action_url.includes('https://')) {
        // Strip external URLs, only keep the path if any
        const url = new URL(action_url, 'http://localhost')
        action_url = url.pathname
      }
      if (!action_url.startsWith('/')) {
        action_url = null
      }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title,
        message,
        type,
        action_url: action_url || null,
        read: false,
      })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data?.[0] ?? {}, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: '알림을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
