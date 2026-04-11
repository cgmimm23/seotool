import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  const { siteId, pageUrl, pageTitle, issuesFound, fixesApplied, metaSnapshot, userAgent } = await req.json()

  if (!siteId || !pageUrl) {
    return NextResponse.json({ error: 'siteId and pageUrl required' }, { status: 400, headers: corsHeaders })
  }

  const supabase = createAdminSupabase()

  // Validate site exists and agent is enabled
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('agent_enabled', true)
    .single()

  if (!site) {
    return NextResponse.json({ error: 'Invalid site' }, { status: 404, headers: corsHeaders })
  }

  // Dedup: skip if same site+page reported in last 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data: existing } = await supabase
    .from('agent_reports')
    .select('id')
    .eq('site_id', siteId)
    .eq('page_url', pageUrl)
    .gte('created_at', fiveMinAgo)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, deduplicated: true }, { headers: corsHeaders })
  }

  await supabase.from('agent_reports').insert({
    site_id: siteId,
    page_url: pageUrl,
    page_title: pageTitle || null,
    issues_found: issuesFound || [],
    fixes_applied: fixesApplied || [],
    meta_snapshot: metaSnapshot || null,
    visitor_ua: userAgent || null,
  })

  return NextResponse.json({ ok: true }, { headers: corsHeaders })
}
