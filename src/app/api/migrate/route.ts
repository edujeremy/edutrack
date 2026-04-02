import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: 'public' } }
    )

    // Try to add billing_cycle and pay_cycle columns
    // Using rpc or raw query isn't available, so we test by reading
    const { data, error } = await supabase
      .from('packages')
      .select('billing_cycle, pay_cycle')
      .limit(1)

    if (error && error.message.includes('billing_cycle')) {
      return NextResponse.json({
        status: 'needs_migration',
        message: 'Please run this SQL in Supabase SQL Editor:\n\nALTER TABLE public.packages ADD COLUMN IF NOT EXISTS billing_cycle INTEGER NOT NULL DEFAULT 0;\nALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pay_cycle INTEGER NOT NULL DEFAULT 0;',
      })
    }

    return NextResponse.json({ status: 'ok', data })
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message })
  }
}
