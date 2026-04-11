import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const strategy = searchParams.get('strategy') || 'mobile'

  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const apiKey = process.env.NEXT_PUBLIC_PAGESPEED_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'PageSpeed API not configured' }, { status: 500 })

  const params = new URLSearchParams({
    url,
    strategy,
    key: apiKey,
    category: 'performance',
  })

  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`)
  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `PageSpeed error: ${res.status}` }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
