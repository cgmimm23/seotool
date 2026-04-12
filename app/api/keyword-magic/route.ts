import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { seed } = await req.json()
  if (!seed) return NextResponse.json({ error: 'seed keyword required' }, { status: 400 })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 })

  const prompt = `You are an SEO keyword research expert. Given the seed keyword "${seed}", generate 30 related keywords.

For each keyword, provide:
- keyword: the keyword phrase
- volume: estimated monthly search volume (realistic number)
- difficulty: SEO difficulty score 1-100 (100 = hardest)
- cpc: estimated Google Ads cost per click in USD
- intent: search intent (informational, commercial, transactional, navigational)

Return ONLY a JSON array. No explanation. Example format:
[{"keyword":"example","volume":1200,"difficulty":45,"cpc":1.50,"intent":"informational"}]`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }),
  })

  if (!res.ok) return NextResponse.json({ error: 'AI request failed' }, { status: 500 })

  const data = await res.json()
  const text = data.content?.[0]?.text?.trim() || ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return NextResponse.json({ error: 'Failed to parse results' }, { status: 500 })

  try {
    const keywords = JSON.parse(jsonMatch[0])
    return NextResponse.json({ keywords, seed })
  } catch {
    return NextResponse.json({ error: 'Failed to parse results' }, { status: 500 })
  }
}
