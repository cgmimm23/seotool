import { authenticateApiKey } from '@/lib/api-auth'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminSupabase()
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const { data, count, error } = await supabase
    .from('sites')
    .select('id, url, name, active, created_at', { count: 'exact' })
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sites: data, total: count, limit, offset })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.scopes.includes('write') && !auth.scopes.includes('admin')) {
    return NextResponse.json({ error: 'Write scope required' }, { status: 403 })
  }

  const { url, name } = await req.json()
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('sites')
    .insert({ user_id: auth.userId, url, name: name || url })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ site: data }, { status: 201 })
}
