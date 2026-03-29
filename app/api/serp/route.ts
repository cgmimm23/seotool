import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { fetchSerpResults } from '@/lib/serpapi'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { keyword, keywordId, saveHistory } = await request.json()
    if (!keyword) return NextResponse.json({ error: 'Keyword required' }, { status: 400 })

    // Get user's SerpAPI key from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('serp_api_key')
      .eq('id', user.id)
      .single()

    const apiKey = profile?.serp_api_key || process.env.SERPAPI_KEY
    if (!apiKey) return NextResponse.json({ error: 'SerpAPI key not configured' }, { status: 400 })

    // Fetch live SERP data
    const serpData = await fetchSerpResults(keyword, apiKey)

    // Save to history if keywordId provided
    if (keywordId && saveHistory) {
      const topResult = serpData.organic_results?.[0]
      await supabase.from('serp_rankings').insert({
        keyword_id: keywordId,
        user_id: user.id,
        position: topResult?.position || null,
        results: serpData.organic_results,
      })
    }

    return NextResponse.json({ results: serpData.organic_results })
  } catch (err: any) {
    console.error('SERP error:', err)
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

    // Get tracked keywords with latest rankings
    const { data: keywords, error } = await supabase
      .from('keywords')
      .select(`
        *,
        serp_rankings (
          position,
          previous_position,
          checked_at
        )
      `)
      .eq('user_id', user.id)
      .eq('site_id', siteId || '')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ keywords })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
