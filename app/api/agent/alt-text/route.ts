import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  const { siteId, images } = await req.json()

  if (!siteId || !images || !Array.isArray(images)) {
    return NextResponse.json({ error: 'siteId and images required' }, { status: 400, headers: corsHeaders })
  }

  const supabase = createAdminSupabase()

  // Validate site
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('agent_enabled', true)
    .single()

  if (!site) {
    return NextResponse.json({ error: 'Invalid site' }, { status: 404, headers: corsHeaders })
  }

  // Limit batch size
  const batch = images.slice(0, 10)
  const results: { src: string; alt: string }[] = []

  // Check cache first
  const srcs = batch.map((img: any) => img.src)
  const { data: cached } = await supabase
    .from('agent_alt_text_cache')
    .select('image_url, alt_text')
    .eq('site_id', siteId)
    .in('image_url', srcs)

  const cacheMap = new Map((cached || []).map(c => [c.image_url, c.alt_text]))

  const uncached = batch.filter((img: any) => !cacheMap.has(img.src))

  // Return cached results
  batch.forEach((img: any) => {
    if (cacheMap.has(img.src)) {
      results.push({ src: img.src, alt: cacheMap.get(img.src)! })
    }
  })

  // Generate alt text for uncached images
  if (uncached.length > 0) {
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      return NextResponse.json({ results }, { headers: corsHeaders })
    }

    // Daily limit: 50 per site
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('agent_alt_text_cache')
      .select('id', { count: 'exact' })
      .eq('site_id', siteId)
      .gte('created_at', today + 'T00:00:00Z')

    if ((count || 0) >= 50) {
      return NextResponse.json({ results, limitReached: true }, { headers: corsHeaders })
    }

    for (const img of uncached) {
      try {
        const prompt = `Generate a concise, descriptive alt text for a web image. The image URL is: ${img.src}. The page context is: ${img.context || 'Unknown'}. Return ONLY the alt text, under 125 characters. No quotes, no explanation.`

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 100,
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        if (res.ok) {
          const data = await res.json()
          const alt = data.content?.[0]?.text?.trim() || ''
          if (alt) {
            results.push({ src: img.src, alt })

            // Cache it
            await supabase.from('agent_alt_text_cache').upsert({
              site_id: siteId,
              image_url: img.src,
              alt_text: alt,
            }, { onConflict: 'site_id,image_url' })
          }
        }
      } catch {}
    }
  }

  return NextResponse.json({ results }, { headers: corsHeaders })
}
