import { authenticateApiKey } from '@/lib/api-auth'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminSupabase()
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', params.siteId)
    .eq('user_id', auth.userId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  return NextResponse.json({ site: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.scopes.includes('write') && !auth.scopes.includes('admin')) {
    return NextResponse.json({ error: 'Write scope required' }, { status: 403 })
  }

  const supabase = createAdminSupabase()
  const { error } = await supabase
    .from('sites')
    .delete()
    .eq('id', params.siteId)
    .eq('user_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
