import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { analyzeKeywords } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { siteId, siteUrl, pagePath, keywords, action } = await request.json()

    if (action === 'analyze') {
      // Run AI keyword analysis
      const analysis = await analyzeKeywords(siteUrl, pagePath, keywords)

      // Save analysis
      await supabase.from('keyword_analyses').insert({
        site_id: siteId,
        user_id: user.id,
        page_path: pagePath,
        keywords,
        score: analysis.score,
        verdict: analysis.verdict,
        fixes: analysis.fixes,
      })

      return NextResponse.json({ analysis })
    }

    if (action === 'save') {
      // Save/update keywords for a page
      const upserts = keywords.map((kw: string) => ({
        site_id: siteId,
        user_id: user.id,
        page_path: pagePath,
        keyword: kw,
      }))

      const { error } = await supabase
        .from('keywords')
        .upsert(upserts, { onConflict: 'site_id,page_path,keyword' })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    console.error('Keywords error:', err)
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
    const pagePath = searchParams.get('pagePath')

    const query = supabase
      .from('keywords')
      .select('*')
      .eq('user_id', user.id)

    if (siteId) query.eq('site_id', siteId)
    if (pagePath) query.eq('page_path', pagePath)

    const { data, error } = await query.order('page_path')
    if (error) throw error

    // Also get latest analysis per page
    const { data: analyses } = await supabase
      .from('keyword_analyses')
      .select('*')
      .eq('user_id', user.id)
      .eq('site_id', siteId || '')
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ keywords: data, analyses })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
