import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { analyzePageOptimization } from '@/lib/anthropic'
import { fetchSerpResults } from '@/lib/serpapi'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { siteId, pageUrl, keyword, secondaryKeywords } = await request.json()
    if (!siteId || !pageUrl || !keyword) {
      return NextResponse.json({ error: 'siteId, pageUrl, and keyword are required' }, { status: 400 })
    }

    // Pull site context for platform + type
    const { data: site } = await supabase
      .from('sites')
      .select('platform, site_type')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single()

    // Fetch top SERP competitors (best-effort — don't block if SerpAPI is unavailable)
    let competitors: any[] = []
    const serpKey = process.env.SERPAPI_KEY
    if (serpKey) {
      try {
        const serp = await fetchSerpResults(keyword, serpKey)
        competitors = (serp.organic_results || []).slice(0, 3).map(r => ({
          position: r.position,
          title: r.title,
          link: r.link,
          snippet: r.snippet,
        }))
      } catch (e) {
        console.warn('SERP fetch failed:', e)
      }
    }

    const analysis = await analyzePageOptimization(
      pageUrl,
      keyword,
      secondaryKeywords || [],
      competitors,
      site?.platform || null,
      site?.site_type || null,
    )

    const { data: report, error } = await supabase
      .from('page_optimization_reports')
      .insert({
        site_id: siteId,
        user_id: user.id,
        page_url: pageUrl,
        keyword,
        secondary_keywords: secondaryKeywords || null,
        optimization_score: analysis.optimization_score,
        summary: analysis.summary,
        ideas: analysis.ideas,
        competitors,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ report, analysis, competitors })
  } catch (err: any) {
    console.error('Page optimizer error:', err)
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
    const pageUrl = searchParams.get('pageUrl')
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

    let query = supabase
      .from('page_optimization_reports')
      .select('*')
      .eq('site_id', siteId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (pageUrl) query = query.eq('page_url', pageUrl)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ reports: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
