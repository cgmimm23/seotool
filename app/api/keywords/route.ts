import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Fetch and extract page signals server-side
async function fetchPageSignals(siteUrl: string, pagePath: string) {
  const signals: Record<string, any> = {}
  try {
    const fullUrl = pagePath === '/' || pagePath === ''
      ? siteUrl.replace(/\/$/, '')
      : siteUrl.replace(/\/$/, '') + (pagePath.startsWith('/') ? pagePath : '/' + pagePath)

    signals.url = fullUrl

    const res = await fetch(fullUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'Marketing-Machine-SEO-Analyzer/1.0' },
    })

    if (!res.ok) {
      signals.fetchError = `Page returned ${res.status}`
      return signals
    }

    const html = await res.text()

    // Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    signals.title = titleMatch ? titleMatch[1].trim() : null
    signals.titleLength = signals.title?.length || 0

    // Meta description
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
    signals.description = descMatch ? descMatch[1].trim() : null
    signals.descriptionLength = signals.description?.length || 0

    // H1
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    signals.h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : null

    // H2s
    const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || []
    signals.h2s = h2Matches.map(h => h.replace(/<[^>]+>/g, '').trim())

    // H3s
    const h3Matches = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) || []
    signals.h3s = h3Matches.map(h => h.replace(/<[^>]+>/g, '').trim())

    // URL slug
    signals.urlSlug = pagePath

    // Canonical
    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    signals.canonical = canonicalMatch ? canonicalMatch[1].trim() : null

    // Images with alt text
    const imgMatches = html.match(/<img[^>]+>/gi) || []
    signals.images = imgMatches.map(img => {
      const altMatch = img.match(/alt=["']([^"']*)["']/i)
      const srcMatch = img.match(/src=["']([^"']+)["']/i)
      return { src: srcMatch?.[1] || '', alt: altMatch?.[1] || null }
    })
    signals.imagesNoAlt = signals.images.filter((img: any) => !img.alt).length

    // Body text (strip all HTML)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const bodyText = bodyMatch
      ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    signals.bodyText = bodyText.substring(0, 3000)
    signals.wordCount = bodyText.split(' ').filter((w: string) => w.length > 2).length

    // First 100 words
    signals.first100Words = bodyText.split(' ').slice(0, 100).join(' ')

    // Internal links
    const linkMatches = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi) || []
    signals.internalLinks = linkMatches
      .map(link => {
        const hrefMatch = link.match(/href=["']([^"']+)["']/i)
        const textMatch = link.match(/>([^<]+)</i)
        return { href: hrefMatch?.[1] || '', text: textMatch?.[1]?.trim() || '' }
      })
      .filter((l: any) => l.href.startsWith('/') || l.href.includes(siteUrl.replace(/^https?:\/\//, '')))

    // Schema markup
    signals.hasSchema = /application\/ld\+json/i.test(html)
    signals.hasOpenGraph = /<meta[^>]+property=["']og:/i.test(html)

    // Check for double slashes in URLs found on page
    const allHrefs = (html.match(/href=["']([^"']+)["']/gi) || []).map(h => h.replace(/href=["']/i, '').replace(/["']$/, ''))
    signals.doubleSlashUrls = allHrefs.filter(h => h.includes('//') && !h.startsWith('http') && !h.startsWith('//'))

  } catch (err: any) {
    signals.fetchError = err.message
  }
  return signals
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { siteId, siteUrl, pagePath, keywords, action } = await request.json()

    if (action === 'analyze') {
      // Fetch real page signals first
      const signals = await fetchPageSignals(siteUrl, pagePath)

      // Build detailed prompt with real page data
      const keywordList = keywords.join(', ')
      const primaryKeyword = keywords[0] || ''

      const prompt = `You are an expert SEO analyst. I have fetched the actual page HTML and extracted the signals below. Analyze this page for the target keywords and return detailed, specific findings.

TARGET KEYWORDS: ${keywordList}
PRIMARY KEYWORD: ${primaryKeyword}

ACTUAL PAGE DATA:
- URL: ${signals.url}
- Page Path: ${pagePath}
- Title Tag: ${signals.title || 'MISSING'}
- Title Length: ${signals.titleLength} characters
- Meta Description: ${signals.description || 'MISSING'}
- Meta Description Length: ${signals.descriptionLength} characters
- H1 Tag: ${signals.h1 || 'NOT DETECTED'}
- H2 Tags: ${signals.h2s?.length > 0 ? signals.h2s.join(' | ') : 'NONE FOUND'}
- H3 Tags: ${signals.h3s?.length > 0 ? signals.h3s.slice(0, 5).join(' | ') : 'NONE FOUND'}
- Word Count: ${signals.wordCount}
- First 100 Words: ${signals.first100Words}
- Images: ${signals.images?.length || 0} total, ${signals.imagesNoAlt} missing alt text
- Canonical URL: ${signals.canonical || 'NOT SET'}
- Has Schema Markup: ${signals.hasSchema ? 'YES' : 'NO'}
- Has Open Graph: ${signals.hasOpenGraph ? 'YES' : 'NO'}
- Internal Links: ${signals.internalLinks?.length || 0} found
- Double Slash URLs: ${signals.doubleSlashUrls?.length > 0 ? signals.doubleSlashUrls.join(', ') : 'NONE'}
${signals.fetchError ? `- FETCH ERROR: ${signals.fetchError}` : ''}

Body text excerpt: ${signals.bodyText?.substring(0, 500)}

Based on the ACTUAL data above, return ONLY a valid JSON object. Do not guess — only report what the data shows.

Required format:
{
  "score": 72,
  "verdict": "one sentence summary of this specific page's optimization for the target keywords",
  "fixes": [
    {
      "priority": 1,
      "status": "fail",
      "title": "Specific issue title",
      "problem": "Exact description of what is wrong with this specific page — quote the actual content where relevant",
      "impact": "Why this hurts SEO for '${primaryKeyword}'",
      "steps": [
        "Step 1 with exact instruction",
        "Step 2 with exact instruction"
      ]
    }
  ]
}

Rules:
- Only report real issues found in the actual data above
- In "problem" field, quote the actual title/H1/description when it's wrong
- In "steps", give exact text suggestions where applicable (e.g. "Change title to: '${primaryKeyword} | Brand Name'")
- Score 0-100 based on actual keyword presence in the signals
- Include 5-10 fixes ordered by SEO impact
- Status must be: fail, warn, or pass
- Output ONLY the JSON object`

      // Call Anthropic
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!anthropicRes.ok) throw new Error('AI analysis failed')
      const aiData = await anthropicRes.json()
      const text = aiData.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || ''

      let analysis
      try {
        analysis = JSON.parse(text.replace(/```json|```/g, '').trim())
      } catch {
        const m = text.match(/\{[\s\S]*\}/)
        if (m) analysis = JSON.parse(m[0])
        else throw new Error('Could not parse analysis response')
      }

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

      return NextResponse.json({ analysis, signals })
    }

    if (action === 'save') {
      const upserts = keywords.map((kw: string) => ({
        site_id: siteId,
        user_id: user.id,
        page_path: pagePath,
        keyword: kw,
      }))
      const { error } = await supabase.from('keywords').upsert(upserts, { onConflict: 'site_id,page_path,keyword' })
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

    const query = supabase.from('keywords').select('*').eq('user_id', user.id)
    if (siteId) query.eq('site_id', siteId)
    if (pagePath) query.eq('page_path', pagePath)

    const { data, error } = await query.order('page_path')
    if (error) throw error

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
