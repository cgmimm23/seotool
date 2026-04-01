import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { messages, siteId } = await req.json()

    if (!siteId) {
      return NextResponse.json({ error: 'siteId required' }, { status: 400 })
    }

    // Use 'as any' on the supabase client to avoid deep type instantiation errors
    const db = supabase as any

    const [siteRes, auditRes, keywordsRes, serpRes, crawlRes] = await Promise.allSettled([
      db.from('sites').select('id, name, url').eq('id', siteId).single(),
      db.from('audit_reports').select('*').eq('site_id', siteId).order('created_at', { ascending: false }).limit(1),
      db.from('keywords').select('keyword, page_path, target_position').eq('site_id', siteId),
      db.from('serp_rankings').select('keyword_id, position, source, checked_at').eq('site_id', siteId).order('checked_at', { ascending: false }).limit(100),
      db.from('crawl_reports').select('pages, summary, url').eq('site_id', siteId).order('created_at', { ascending: false }).limit(1),
    ])

    const site = siteRes.status === 'fulfilled' ? siteRes.value.data : null
    const latestAudit = auditRes.status === 'fulfilled' ? auditRes.value.data?.[0] : null
    const keywords = keywordsRes.status === 'fulfilled' ? keywordsRes.value.data : []
    const serpRankings = serpRes.status === 'fulfilled' ? serpRes.value.data : []
    const crawlReport = crawlRes.status === 'fulfilled' ? crawlRes.value.data?.[0] : null

    const systemPrompt = `You are an expert SEO assistant inside Marketing Machine, an SEO platform. You help users understand their site's SEO performance, fix issues, and use the platform effectively.

You have full access to the following data for the site you are helping with:

## Site Info
- Name: ${site?.name || 'Unknown'}
- URL: ${site?.url || 'Unknown'}
- Site ID: ${siteId}

## Latest SEO Audit${latestAudit ? `
- Overall Score: ${latestAudit.overall_score}/100
- Grade: ${latestAudit.grade || 'N/A'}
- Summary: ${latestAudit.summary || 'N/A'}
- Categories: ${JSON.stringify(latestAudit.categories || {})}
- Errors: ${(latestAudit.checks || []).filter((c: any) => c.status === 'fail').length}
- Warnings: ${(latestAudit.checks || []).filter((c: any) => c.status === 'warn').length}
- Passing: ${(latestAudit.checks || []).filter((c: any) => c.status === 'pass').length}
- Top Issues: ${JSON.stringify((latestAudit.checks || []).filter((c: any) => c.status === 'fail').slice(0, 10))}
- Run Date: ${latestAudit.created_at}` : '\n- No audit has been run yet. Recommend the user run a Site Audit.'}

## Keywords (${keywords?.length || 0} tracked)
${keywords && keywords.length > 0 ? keywords.map((k: any) => `- "${k.keyword}" targeting ${k.page_path}${k.target_position ? ` (goal: position ${k.target_position})` : ''}`).join('\n') : '- No keywords tracked yet. Recommend adding keywords in the Keywords section.'}

## SERP Rankings (recent checks)
${serpRankings && serpRankings.length > 0 ? serpRankings.slice(0, 20).map((r: any) => `- keyword_id: ${r.keyword_id}, position: ${r.position}, source: ${r.source}, checked: ${r.checked_at}`).join('\n') : '- No SERP ranking data yet. Recommend using the SERP Tracker.'}

## Site Crawl${crawlReport ? `
- URL: ${crawlReport.url}
- Pages Crawled: ${crawlReport.pages?.length || 0}
- AI Summary: ${crawlReport.summary || 'No summary generated'}
- Issues Overview: ${JSON.stringify({
  errorPages: (crawlReport.pages || []).filter((p: any) => p.status >= 400).length,
  missingTitles: (crawlReport.pages || []).filter((p: any) => !p.title).length,
  missingDescriptions: (crawlReport.pages || []).filter((p: any) => !p.description).length,
  thinContent: (crawlReport.pages || []).filter((p: any) => p.wordCount < 300).length,
  imagesNoAlt: (crawlReport.pages || []).reduce((a: number, p: any) => a + p.imagesNoAlt, 0),
})}` : '\n- No crawl report yet. Recommend running the Site Crawler.'}

## Platform Guide
The Marketing Machine platform has these tools:
- Site Overview: Dashboard with key metrics
- Site Audit: AI-powered full SEO analysis with score and actionable fixes
- Site Crawler: Crawls every page and finds technical SEO issues
- Keywords: Set target keywords per page and get optimization scores
- SERP Tracker: Live Google rankings via SerpAPI
- Rank History: Keyword position history over time
- Page Speed: Core Web Vitals via Google PageSpeed Insights
- AI Visibility: Check visibility to AI search engines
- Backlinks: Live backlink data via Moz
- Analytics: GA4 traffic data
- Search Console: GSC keyword rankings
- Google Ads, Bing Ads, Facebook Ads: Paid campaign performance
- Local SEO, Google Reviews, Aggregators: Local SEO tools
- Schema Builder, Image Tool, GBP Creator: Utility tools

## Your Role
- Answer questions about this site's SEO performance using the real data above
- Give specific, actionable recommendations based on actual issues found
- Guide users through how to use each tool in the platform
- Be encouraging but honest about issues
- Keep responses concise and practical
- Use bullet points for lists of issues or steps
- If you don't have data for something, say so and tell the user how to get it`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      throw new Error(`Anthropic error: ${anthropicRes.status} ${err}`)
    }

    const data = await anthropicRes.json()
    const text = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || ''

    return NextResponse.json({ message: text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
