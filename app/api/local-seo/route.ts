import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, keyword, location, query } = await req.json()
  const serpKey = process.env.SERPAPI_KEY

  if (action === 'rankings' && keyword) {
    if (!serpKey) return NextResponse.json({ error: 'SERP API not configured' }, { status: 500 })

    const params = new URLSearchParams({
      engine: 'google',
      q: keyword,
      location: location || '',
      api_key: serpKey,
    })

    const res = await fetch(`https://serpapi.com/search.json?${params}`)
    if (!res.ok) return NextResponse.json({ error: 'SERP lookup failed' }, { status: 500 })
    const data = await res.json()
    return NextResponse.json({ results: data.organic_results || [], local_results: data.local_results || {} })
  }

  if (action === 'analyze' && query) {
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: query }],
      }),
    })

    if (!res.ok) return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
    const data = await res.json()
    const text = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || ''
    return NextResponse.json({ analysis: text })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
