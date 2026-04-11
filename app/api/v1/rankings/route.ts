import { authenticateApiKey } from '@/lib/api-auth'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminSupabase()
  const { searchParams } = new URL(req.url)
  const keywordId = searchParams.get('keyword_id')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase
    .from('serp_rankings')
    .select('id, keyword_id, position, previous_position, checked_at')
    .eq('user_id', auth.userId)
    .order('checked_at', { ascending: false })
    .limit(limit)

  if (keywordId) query = query.eq('keyword_id', keywordId)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ rankings: data })
}
