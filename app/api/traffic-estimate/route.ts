import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { domain } = await req.json()
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const mozToken = process.env.MOZ_API_TOKEN

  // Get Moz metrics
  let mozData: any = null
  if (mozToken) {
    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
      const res = await fetch('https://lsapi.seomoz.com/v2/url_metrics', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${mozToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: [cleanDomain], metrics: ['domain_authority', 'page_authority', 'linking_root_domains', 'links_to_target'] }),
      })
      if (res.ok) { const d = await res.json(); mozData = d.results?.[0] }
    } catch {}
  }

  // AI traffic estimation
  const prompt = `Estimate the monthly organic traffic for the website: ${domain}

Known metrics:
- Domain Authority: ${mozData?.domain_authority ? Math.round(mozData.domain_authority) : 'Unknown'}
- Linking Domains: ${mozData?.linking_root_domains || 'Unknown'}

Provide a JSON object with:
- estimated_monthly_traffic: number (realistic estimate)
- traffic_range_low: number
- traffic_range_high: number
- estimated_organic_keywords: number (how many keywords they likely rank for)
- estimated_traffic_value: number (estimated value in USD if they had to pay for this traffic via ads)
- top_traffic_sources: array of 5 objects with {source, percentage} (e.g., "Google Organic", "Direct", etc.)
- traffic_trend: "growing" | "stable" | "declining" (best guess)
- confidence: "low" | "medium" | "high"

Return ONLY the JSON object, no explanation.`

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
  })

  if (!aiRes.ok) return NextResponse.json({ error: 'AI request failed' }, { status: 500 })

  const aiData = await aiRes.json()
  const text = aiData.content?.[0]?.text?.trim() || ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)

  let estimate = {}
  try { estimate = JSON.parse(jsonMatch?.[0] || '{}') } catch {}

  return NextResponse.json({
    domain,
    moz: mozData ? {
      da: Math.round(mozData.domain_authority || 0),
      pa: Math.round(mozData.page_authority || 0),
      linkingDomains: mozData.linking_root_domains || 0,
    } : null,
    ...estimate,
  })
}
