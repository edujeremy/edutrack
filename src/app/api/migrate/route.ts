import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Use Supabase Management API to run DDL
    const SUPABASE_PROJECT_REF = 'fvnyvwitrqjxcgkfgtxr'
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD

    // Method 1: Try Management API with service role
    const managementToken = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_0baa0e15e8804e0a9e3ea9c2e6408db1e23a8b70'

    const sql = `
      ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS billing_cycle INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS pay_cycle INTEGER NOT NULL DEFAULT 0;
    `

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${managementToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      }
    )

    const result = await response.json()

    if (response.ok) {
      return NextResponse.json({ status: 'migrated', result })
    }

    // If management API fails, return instructions
    return NextResponse.json({
      status: 'needs_manual_migration',
      api_status: response.status,
      api_response: result,
      sql_to_run: sql.trim(),
    })
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message })
  }
}
