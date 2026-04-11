import { authenticateApiKey } from '@/lib/api-auth'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminSupabase()
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('site_id')

  let query = supabase
    .from('keywords')
    .select('id, site_id, page_path, keyword, target_position, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (siteId) query = query.eq('site_id', siteId)

  const { data, error } = await query.limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ keywords: data })
}
