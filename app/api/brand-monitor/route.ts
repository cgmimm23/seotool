import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { brandName } = await req.json()
  if (!brandName) return NextResponse.json({ error: 'brandName required' }, { status: 400 })

  const serpKey = process.env.SERPAPI_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  // Search for brand mentions via SerpAPI
  let mentions: any[] = []
  if (serpKey) {
    try {
      const res = await fetch(`https://serpapi.com/search.json?engine=google&q="${encodeURIComponent(brandName)}"&num=20&api_key=${serpKey}`)
      if (res.ok) {
        const data = await res.json()
        mentions = (data.organic_results || []).map((r: any) => ({
          title: r.title,
          url: r.link,
          snippet: r.snippet,
          domain: new URL(r.link).hostname,
          position: r.position,
        }))
      }
    } catch {}

    // Also search news
    try {
      const res = await fetch(`https://serpapi.com/search.json?engine=google&q="${encodeURIComponent(brandName)}"&tbm=nws&num=10&api_key=${serpKey}`)
      if (res.ok) {
        const data = await res.json()
        const news = (data.news_results || []).map((r: any) => ({
          title: r.title,
          url: r.link,
          snippet: r.snippet,
          domain: r.source,
          date: r.date,
          type: 'news',
        }))
        mentions = [...mentions, ...news]
      }
    } catch {}
  }

  // AI sentiment analysis
  let analysis = ''
  if (anthropicKey && mentions.length > 0) {
    const mentionSummary = mentions.slice(0, 15).map(m => `- ${m.title}: ${m.snippet}`).join('\n')
    const prompt = `Analyze these brand mentions for "${brandName}":

${mentionSummary}

Provide:
1. Overall sentiment (positive/neutral/negative)
2. Key themes in mentions
3. Notable mentions to respond to
4. Brand reputation summary (2-3 sentences)

Keep it concise.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
      })
      if (res.ok) {
        const data = await res.json()
        analysis = data.content?.[0]?.text || ''
      }
    } catch {}
  }

  return NextResponse.json({ mentions, analysis, totalMentions: mentions.length })
}
