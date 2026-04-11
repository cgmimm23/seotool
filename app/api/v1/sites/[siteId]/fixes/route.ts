import { authenticateApiKey } from '@/lib/api-auth'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { generateAndStoreFixes } from '@/lib/fix-generator'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Fetch pending fixes for a site
export async function GET(req: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminSupabase()

  // Verify site ownership
  const { data: site } = await supabase
    .from('sites')
    .select('id, url')
    .eq('id', params.siteId)
    .eq('user_id', auth.userId)
    .single()

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'

  let query = supabase
    .from('fix_instructions')
    .select('id, page_url, fix_type, priority, target, current_value, suggested_value, status, applied_by, applied_at, created_at')
    .eq('site_id', params.siteId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ fixes: data })
}

// POST: Generate new fixes from latest audit
export async function POST(req: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminSupabase()

  const { data: site } = await supabase
    .from('sites')
    .select('id, url')
    .eq('id', params.siteId)
    .eq('user_id', auth.userId)
    .single()

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  // Get latest audit
  const { data: audit } = await supabase
    .from('audit_reports')
    .select('id')
    .eq('site_id', params.siteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!audit) return NextResponse.json({ error: 'No audit found. Run an audit first.' }, { status: 404 })

  const count = await generateAndStoreFixes(params.siteId, audit.id, site.url)

  return NextResponse.json({ generated: count, message: `${count} fix instructions generated` })
}
