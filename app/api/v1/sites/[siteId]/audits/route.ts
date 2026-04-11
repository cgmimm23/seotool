import { authenticateApiKey } from '@/lib/api-auth'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminSupabase()

  // Verify site ownership
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', params.siteId)
    .eq('user_id', auth.userId)
    .single()

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  const { data, error } = await supabase
    .from('audit_reports')
    .select('id, url, overall_score, grade, summary, categories, created_at')
    .eq('site_id', params.siteId)
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ audits: data })
}
