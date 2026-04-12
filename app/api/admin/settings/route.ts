import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Platform settings stored in a simple key-value table
// For now, use a JSON file approach via a single row

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = createAdminSupabase()
  const { data } = await supabase
    .from('platform_settings')
    .select('key, value')

  const settings: Record<string, string> = {}
  ;(data || []).forEach((row: any) => { settings[row.key] = row.value })

  return NextResponse.json({ settings })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { key, value } = await req.json()
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  const supabase = createAdminSupabase()

  await supabase.from('platform_settings').upsert(
    { key, value: value || '' },
    { onConflict: 'key' }
  )

  return NextResponse.json({ success: true })
}
