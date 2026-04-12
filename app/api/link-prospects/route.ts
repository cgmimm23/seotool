import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { siteUrl, niche } = await req.json()
  if (!siteUrl) return NextResponse.json({ error: 'siteUrl required' }, { status: 400 })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 })

  const prompt = `You are a link building expert. For the website ${siteUrl} in the "${niche || 'general'}" niche, find 15 realistic link building prospects.

For each prospect, provide:
- domain: the website domain
- type: "guest_post" | "resource_page" | "directory" | "partnership" | "broken_link" | "skyscraper"
- estimated_da: estimated domain authority (1-100)
- difficulty: how hard to get a link (easy/medium/hard)
- approach: one sentence on how to reach out
- why: why this site would link to them

Return ONLY a JSON array. No explanation.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
  })

  if (!res.ok) return NextResponse.json({ error: 'AI request failed' }, { status: 500 })

  const data = await res.json()
  const text = data.content?.[0]?.text?.trim() || ''
  const jsonMatch = text.match(/\[[\s\S]*\]/)

  try {
    return NextResponse.json({ prospects: JSON.parse(jsonMatch?.[0] || '[]') })
  } catch {
    return NextResponse.json({ error: 'Failed to parse results' }, { status: 500 })
  }
}
