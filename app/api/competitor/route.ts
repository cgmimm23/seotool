import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { competitorUrl, siteUrl, action } = await req.json()

  if (action === 'analyze') {
    if (!competitorUrl) return NextResponse.json({ error: 'competitorUrl required' }, { status: 400 })

    // Get competitor backlink metrics via Moz
    const mozToken = process.env.MOZ_API_TOKEN
    let competitorMetrics: any = null

    if (mozToken) {
      try {
        const cleanUrl = competitorUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
        const res = await fetch('https://lsapi.seomoz.com/v2/url_metrics', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${mozToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ targets: [cleanUrl], metrics: ['domain_authority', 'page_authority', 'linking_root_domains', 'links_to_target', 'spam_score'] }),
        })
        if (res.ok) {
          const data = await res.json()
          competitorMetrics = data.results?.[0] || null
        }
      } catch {}
    }

    // Get competitor SERP presence via SerpAPI
    const serpKey = process.env.SERPAPI_KEY
    let competitorKeywords: any[] = []

    if (serpKey && competitorUrl) {
      try {
        const domain = competitorUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
        const res = await fetch(`https://serpapi.com/search.json?engine=google&q=site:${domain}&num=20&api_key=${serpKey}`)
        if (res.ok) {
          const data = await res.json()
          competitorKeywords = (data.organic_results || []).map((r: any) => ({
            title: r.title,
            url: r.link,
            snippet: r.snippet,
            position: r.position,
          }))
        }
      } catch {}
    }

    // AI analysis
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    let aiAnalysis = ''

    if (anthropicKey) {
      try {
        const prompt = `Analyze this competitor website for SEO: ${competitorUrl}
Compare against: ${siteUrl || 'N/A'}

Competitor metrics: DA ${competitorMetrics?.domain_authority || 'N/A'}, PA ${competitorMetrics?.page_authority || 'N/A'}, Linking domains: ${competitorMetrics?.linking_root_domains || 'N/A'}
Indexed pages found: ${competitorKeywords.length}

Provide a brief competitive analysis covering:
1. Estimated strengths of this competitor
2. Content strategy observations
3. Opportunities to outrank them
4. Key differences and gaps

Keep it concise — 200 words max.`

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
        })
        if (res.ok) {
          const data = await res.json()
          aiAnalysis = data.content?.[0]?.text || ''
        }
      } catch {}
    }

    return NextResponse.json({
      competitor: {
        url: competitorUrl,
        da: Math.round(competitorMetrics?.domain_authority || 0),
        pa: Math.round(competitorMetrics?.page_authority || 0),
        linkingDomains: competitorMetrics?.linking_root_domains || 0,
        totalLinks: competitorMetrics?.links_to_target || 0,
        spamScore: Math.round((competitorMetrics?.spam_score || 0) * 100),
      },
      indexedPages: competitorKeywords,
      aiAnalysis,
    })
  }

  if (action === 'content-gap') {
    if (!competitorUrl || !siteUrl) return NextResponse.json({ error: 'Both URLs required' }, { status: 400 })

    const serpKey = process.env.SERPAPI_KEY
    if (!serpKey) return NextResponse.json({ error: 'SERP API not configured' }, { status: 500 })

    const compDomain = competitorUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    const yourDomain = siteUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')

    // Get competitor's top pages
    const compRes = await fetch(`https://serpapi.com/search.json?engine=google&q=site:${compDomain}&num=20&api_key=${serpKey}`)
    const compData = compRes.ok ? await compRes.json() : { organic_results: [] }

    // Get your top pages
    const yourRes = await fetch(`https://serpapi.com/search.json?engine=google&q=site:${yourDomain}&num=20&api_key=${serpKey}`)
    const yourData = yourRes.ok ? await yourRes.json() : { organic_results: [] }

    const yourUrls = new Set((yourData.organic_results || []).map((r: any) => r.link))

    // Find pages competitor has that you don't cover
    const gaps = (compData.organic_results || [])
      .filter((r: any) => {
        const topic = r.title?.toLowerCase() || ''
        const yourHas = Array.from(yourUrls).some(u => {
          const uStr = u as string
          return topic.split(' ').some((w: string) => w.length > 4 && uStr.toLowerCase().includes(w))
        })
        return !yourHas
      })
      .map((r: any) => ({ title: r.title, url: r.link, snippet: r.snippet }))

    return NextResponse.json({ gaps, competitorPages: compData.organic_results?.length || 0, yourPages: yourData.organic_results?.length || 0 })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
