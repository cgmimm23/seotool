import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { generateKeywordStrategy } from '@/lib/anthropic'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { siteId } = await request.json()
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

    const { data: site } = await supabase
      .from('sites')
      .select('url, site_type, platform, audit_notes')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single()

    if (!site?.url) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

    const strategy = await generateKeywordStrategy(
      site.url,
      site.site_type,
      site.platform,
      site.audit_notes,
    )

    const { data: report, error } = await supabase
      .from('keyword_strategies')
      .insert({
        site_id: siteId,
        user_id: user.id,
        summary: strategy.summary,
        core_phrases: strategy.core_phrases,
        long_tail_clusters: strategy.long_tail_clusters,
        deployment_strategy: strategy.deployment_strategy,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ strategy, report })
  } catch (err: any) {
    console.error('Keyword strategy error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

    const { data, error } = await supabase
      .from('keyword_strategies')
      .select('*')
      .eq('site_id', siteId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    return NextResponse.json({ strategies: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
