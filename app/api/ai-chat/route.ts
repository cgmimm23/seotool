import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { runSeoAudit } from '@/lib/anthropic'
import { fetchSerpResults } from '@/lib/serpapi'

export const dynamic = 'force-dynamic'

type ToolCall = { id: string; name: string; input: any; result?: any; error?: string }

const TOOLS = [
  {
    name: 'add_keywords',
    description: 'Add one or more keywords to track for a specific page of the site. Upserts — duplicates are ignored.',
    input_schema: {
      type: 'object',
      properties: {
        page_path: { type: 'string', description: "The page path to track these keywords for, e.g. '/', '/services', '/about'. Use '/' for homepage." },
        keywords: { type: 'array', items: { type: 'string' }, description: 'List of keyword phrases to track.' },
      },
      required: ['page_path', 'keywords'],
    },
  },
  {
    name: 'remove_keyword',
    description: 'Delete a tracked keyword. If page_path is provided, only removes on that page; otherwise removes the keyword across all pages.',
    input_schema: {
      type: 'object',
      properties: {
        keyword: { type: 'string' },
        page_path: { type: 'string', description: 'Optional. If omitted, removes the keyword across all pages.' },
      },
      required: ['keyword'],
    },
  },
  {
    name: 'list_keywords',
    description: 'List the currently-tracked keywords for the site, grouped by page.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'run_audit',
    description: 'Run a full AI-powered SEO audit of the site. Takes 20-40 seconds. Saves a report and returns the score, grade, summary, and top issues.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'run_pagespeed',
    description: 'Run Google PageSpeed Insights for the site homepage. Returns Core Web Vitals and performance score.',
    input_schema: {
      type: 'object',
      properties: {
        strategy: { type: 'string', enum: ['mobile', 'desktop'], description: 'Default: mobile.' },
        url: { type: 'string', description: 'Optional specific URL to test. Defaults to the site homepage.' },
      },
    },
  },
  {
    name: 'run_serp_check',
    description: 'Check live Google rankings for a specific keyword via SerpAPI. Returns the top organic results and where this site ranks (if it does).',
    input_schema: {
      type: 'object',
      properties: {
        keyword: { type: 'string' },
        save_history: { type: 'boolean', description: 'If true and the keyword is already tracked, saves this result to rank history.' },
      },
      required: ['keyword'],
    },
  },
  {
    name: 'run_ai_visibility',
    description: 'Check whether the site is discoverable by AI search engines (llms.txt, ai.txt, robots.txt).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'analyze_page',
    description: 'Analyze a specific page for how well it is optimized for target keywords. Fetches the live page, extracts signals, returns score + detailed fixes.',
    input_schema: {
      type: 'object',
      properties: {
        page_path: { type: 'string', description: "Path of the page to analyze, e.g. '/services'." },
        keywords: { type: 'array', items: { type: 'string' }, description: 'Target keywords for this page.' },
      },
      required: ['page_path', 'keywords'],
    },
  },
  {
    name: 'sync_gsc',
    description: 'Pull Google Search Console data into the tracked-rankings history for this site. Requires Google to be connected and a GSC property selected.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days back to sync. Default 90.' },
      },
    },
  },
]

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
    if (!res.ok) { signals.fetchError = `Page returned ${res.status}`; return signals }
    const html = await res.text()

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    signals.title = titleMatch ? titleMatch[1].trim() : null
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
    signals.description = descMatch ? descMatch[1].trim() : null
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    signals.h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : null
    const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || []
    signals.h2s = h2Matches.map(h => h.replace(/<[^>]+>/g, '').trim())
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const bodyText = bodyMatch
      ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : ''
    signals.wordCount = bodyText.split(' ').filter(w => w.length > 2).length
    signals.bodyText = bodyText.substring(0, 3000)
    const imgMatches = html.match(/<img[^>]+>/gi) || []
    signals.images = imgMatches.length
    signals.imagesNoAlt = imgMatches.filter(img => !/alt=["'][^"']+["']/i.test(img)).length
    signals.hasSchema = /application\/ld\+json/i.test(html)
  } catch (err: any) {
    signals.fetchError = err.message
  }
  return signals
}

async function executeTool(
  tool: { name: string; input: any },
  ctx: { siteId: string; userId: string; site: any; serviceDb: any }
): Promise<any> {
  const { name, input } = tool
  const { siteId, userId, site, serviceDb } = ctx

  if (name === 'add_keywords') {
    const rows = (input.keywords || []).map((kw: string) => ({
      site_id: siteId, user_id: userId, page_path: input.page_path || '/', keyword: kw.trim(),
    })).filter((r: any) => r.keyword)
    if (rows.length === 0) return { added: 0 }
    const { error } = await serviceDb.from('keywords').upsert(rows, { onConflict: 'site_id,page_path,keyword', ignoreDuplicates: true })
    if (error) throw new Error(error.message)
    return { added: rows.length, page_path: input.page_path, keywords: rows.map((r: any) => r.keyword) }
  }

  if (name === 'remove_keyword') {
    let q = serviceDb.from('keywords').delete().eq('site_id', siteId).eq('user_id', userId).eq('keyword', input.keyword)
    if (input.page_path) q = q.eq('page_path', input.page_path)
    const { data: deleted, error } = await q.select()
    if (error) throw new Error(error.message)
    return { removed: deleted?.length || 0, keyword: input.keyword }
  }

  if (name === 'list_keywords') {
    const { data } = await serviceDb.from('keywords').select('keyword, page_path, target_position').eq('site_id', siteId).order('page_path')
    return { count: data?.length || 0, keywords: data || [] }
  }

  if (name === 'run_audit') {
    const audit = await runSeoAudit(site.url, site.site_type || null, site.platform || null, site.audit_notes || null)
    const { data } = await serviceDb.from('audit_reports').insert({
      site_id: siteId, user_id: userId, url: audit.url || site.url,
      overall_score: audit.overall_score, grade: audit.grade, summary: audit.summary,
      categories: audit.categories, checks: audit.checks,
    }).select().single()
    await serviceDb.from('scan_schedule').upsert({ site_id: siteId, user_id: userId, last_scanned_at: new Date().toISOString() })
    const fails = (audit.checks || []).filter((c: any) => c.status === 'fail')
    return {
      report_id: data?.id,
      score: audit.overall_score,
      grade: audit.grade,
      summary: audit.summary,
      fails: fails.length,
      warns: (audit.checks || []).filter((c: any) => c.status === 'warn').length,
      passes: (audit.checks || []).filter((c: any) => c.status === 'pass').length,
      top_issues: fails.slice(0, 8).map((c: any) => ({ title: c.title, severity: c.severity, recommendation: c.recommendation })),
    }
  }

  if (name === 'run_pagespeed') {
    const apiKey = process.env.NEXT_PUBLIC_PAGESPEED_API_KEY
    if (!apiKey) throw new Error('PageSpeed API key not configured')
    const targetUrl = input.url || site.url
    const strategy = input.strategy || 'mobile'
    const params = new URLSearchParams({ url: targetUrl, strategy, key: apiKey, category: 'performance' })
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`)
    if (!res.ok) throw new Error(`PageSpeed error ${res.status}`)
    const data = await res.json()
    const audits = data.lighthouseResult?.audits || {}
    return {
      url: targetUrl,
      strategy,
      performance_score: Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100),
      lcp: audits['largest-contentful-paint']?.displayValue,
      fcp: audits['first-contentful-paint']?.displayValue,
      cls: audits['cumulative-layout-shift']?.displayValue,
      tbt: audits['total-blocking-time']?.displayValue,
      speed_index: audits['speed-index']?.displayValue,
    }
  }

  if (name === 'run_serp_check') {
    const { data: profile } = await serviceDb.from('profiles').select('serp_api_key').eq('id', userId).single()
    const apiKey = profile?.serp_api_key || process.env.SERPAPI_KEY
    if (!apiKey) throw new Error('SerpAPI key not configured. Add one in profile settings.')
    const serp = await fetchSerpResults(input.keyword, apiKey)
    const results = serp.organic_results || []
    const domain = site.url.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0]
    const mine = results.find((r: any) => r.link?.includes(domain))

    if (input.save_history) {
      const { data: kw } = await serviceDb.from('keywords').select('id').eq('site_id', siteId).eq('keyword', input.keyword).limit(1).single()
      if (kw?.id) {
        await serviceDb.from('serp_rankings').insert({
          keyword_id: kw.id, user_id: userId,
          position: mine?.position || null, source: 'serp', results,
        })
      }
    }
    return {
      keyword: input.keyword,
      site_position: mine?.position || null,
      top_10: results.slice(0, 10).map((r: any) => ({ position: r.position, title: r.title, link: r.link })),
    }
  }

  if (name === 'run_ai_visibility') {
    const parsed = new URL(site.url.startsWith('http') ? site.url : 'https://' + site.url)
    const base = `${parsed.protocol}//${parsed.hostname}`
    const [llms, ai, robots] = await Promise.allSettled([
      fetch(`${base}/llms.txt`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${base}/ai.txt`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${base}/robots.txt`, { signal: AbortSignal.timeout(5000) }),
    ])
    return {
      llms_txt: llms.status === 'fulfilled' && llms.value.ok,
      ai_txt: ai.status === 'fulfilled' && ai.value.ok,
      robots_txt: robots.status === 'fulfilled' && robots.value.ok,
    }
  }

  if (name === 'analyze_page') {
    const signals = await fetchPageSignals(site.url, input.page_path)
    const primary = input.keywords?.[0] || ''
    const prompt = `You are an expert SEO analyst. Analyze this page for target keywords.
Keywords: ${(input.keywords || []).join(', ')}
URL: ${signals.url}
Title: ${signals.title || 'MISSING'}
Meta Description: ${signals.description || 'MISSING'}
H1: ${signals.h1 || 'NONE'}
H2s: ${(signals.h2s || []).join(' | ') || 'NONE'}
Word Count: ${signals.wordCount}
Images: ${signals.images || 0} (${signals.imagesNoAlt || 0} missing alt)
Schema: ${signals.hasSchema ? 'yes' : 'no'}
Body excerpt: ${(signals.bodyText || '').substring(0, 600)}

Return JSON: {"score": 0-100, "verdict": "one sentence", "fixes": [{"priority": 1-5, "status": "fail"|"warn"|"pass", "title": "...", "problem": "...", "steps": ["..."]}]}. Return ONLY JSON.`
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) throw new Error('Analysis failed')
    const j = await res.json()
    const text = j.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('') || ''
    const match = text.match(/\{[\s\S]*\}/)
    const analysis = match ? JSON.parse(match[0]) : null
    if (analysis) {
      await serviceDb.from('keyword_analyses').insert({
        site_id: siteId, user_id: userId, page_path: input.page_path,
        keywords: input.keywords, score: analysis.score, verdict: analysis.verdict, fixes: analysis.fixes,
      })
    }
    return analysis || { error: 'Analysis could not be parsed' }
  }

  if (name === 'sync_gsc') {
    const { data: siteData } = await serviceDb.from('sites').select('gsc_site_url').eq('id', siteId).single()
    if (!siteData?.gsc_site_url) throw new Error('No GSC property selected. Connect Google and pick a property on the Rank History page first.')
    const days = input.days || 90
    const { getGoogleToken } = await import('@/lib/google-token')
    const accessToken = await getGoogleToken(siteId)
    if (!accessToken) throw new Error('Google not connected for this site.')

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteData.gsc_site_url)}/searchAnalytics/query`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ['query', 'date'], rowLimit: 1000, dataState: 'all' }),
    })
    if (!res.ok) throw new Error('GSC API error')
    const data = await res.json()
    const rows = data.rows || []
    if (rows.length === 0) return { synced: 0, message: 'No data returned' }

    const uniqueKeywords = Array.from(new Set(rows.map((r: any) => r.keys[0]))) as string[]
    await serviceDb.from('keywords').upsert(
      uniqueKeywords.map(kw => ({ site_id: siteId, user_id: userId, keyword: kw, page_path: '/' })),
      { onConflict: 'site_id,page_path,keyword', ignoreDuplicates: true }
    )
    const { data: kws } = await serviceDb.from('keywords').select('id, keyword').eq('site_id', siteId).eq('user_id', userId)
    const kwMap: Record<string, string> = {}
    for (const kw of kws || []) kwMap[kw.keyword] = kw.id

    const rankings = rows
      .map((r: any) => ({
        keyword_id: kwMap[r.keys[0]], user_id: userId,
        position: Math.round(r.position), source: 'gsc', checked_at: new Date(r.keys[1]).toISOString(),
      }))
      .filter((r: any) => r.keyword_id)

    let synced = 0
    for (let i = 0; i < rankings.length; i += 500) {
      const batch = rankings.slice(i, i + 500)
      const { error } = await serviceDb.from('serp_rankings').upsert(batch, { onConflict: 'keyword_id,source,checked_at', ignoreDuplicates: true })
      if (!error) synced += batch.length
    }
    return { synced, total: rows.length, keywords_found: uniqueKeywords.length }
  }

  throw new Error(`Unknown tool: ${name}`)
}

export async function POST(req: NextRequest) {
  try {
    const { messages, siteId } = await req.json()
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

    // Auth via cookies
    const userDb = createServerSupabase()
    const { data: { user } } = await userDb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify site ownership
    const serviceDb: any = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: site } = await serviceDb.from('sites').select('id, name, url, user_id, site_type, platform, audit_notes').eq('id', siteId).single()
    if (!site || site.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Load context for system prompt
    const [auditRes, kwRes, serpRes, crawlRes] = await Promise.allSettled([
      serviceDb.from('audit_reports').select('*').eq('site_id', siteId).order('created_at', { ascending: false }).limit(1),
      serviceDb.from('keywords').select('keyword, page_path, target_position').eq('site_id', siteId),
      serviceDb.from('serp_rankings').select('keyword_id, position, source, checked_at').eq('site_id', siteId).order('checked_at', { ascending: false }).limit(50),
      serviceDb.from('crawl_reports').select('pages, summary, url').eq('site_id', siteId).order('created_at', { ascending: false }).limit(1),
    ])
    const latestAudit = auditRes.status === 'fulfilled' ? (auditRes.value as any).data?.[0] : null
    const keywords = kwRes.status === 'fulfilled' ? (kwRes.value as any).data : []
    const serpRankings = serpRes.status === 'fulfilled' ? (serpRes.value as any).data : []
    const crawlReport = crawlRes.status === 'fulfilled' ? (crawlRes.value as any).data?.[0] : null

    const systemPrompt = `You are Jonathan, an expert SEO agent inside SEO by CGMIMM. You help the user understand their site's SEO performance AND you take action on their behalf — don't just describe how to do things, do them.

## Site
- Name: ${site.name}
- URL: ${site.url}
- Site ID: ${siteId}

## Latest Audit${latestAudit ? `
- Score: ${latestAudit.overall_score}/100 (${latestAudit.grade})
- Summary: ${latestAudit.summary}
- Errors: ${(latestAudit.checks || []).filter((c: any) => c.status === 'fail').length}, Warnings: ${(latestAudit.checks || []).filter((c: any) => c.status === 'warn').length}
- Run: ${latestAudit.created_at}` : '\n- No audit yet — offer to run one.'}

## Keywords (${keywords?.length || 0} tracked)
${keywords?.length ? keywords.slice(0, 30).map((k: any) => `- "${k.keyword}" → ${k.page_path}`).join('\n') : '- None tracked yet.'}

## Recent SERP Rankings
${serpRankings?.length ? serpRankings.slice(0, 10).map((r: any) => `- kw ${r.keyword_id}: #${r.position} (${r.source})`).join('\n') : '- No ranking data yet.'}

## Crawl${crawlReport ? `
- Pages: ${crawlReport.pages?.length || 0}
- Summary: ${crawlReport.summary || 'N/A'}` : '\n- No crawl yet.'}

## How to behave
- When the user asks you to do something (add a keyword, run an audit, check a ranking, sync GSC, etc.) — USE THE TOOL, don't just explain how.
- Chain tools when it makes sense: if the user says "track these 3 keywords and check where they rank", add them and then run a SERP check for each.
- Before destructive actions like remove_keyword on many items, confirm in chat first.
- After a tool runs, summarize the result concisely with the actual numbers — don't restate the whole payload.
- If a tool errors, explain in plain English what's wrong and what to do.
- Use web_search for: live site content, competitor research, SERP examples, SEO news.
- Keep responses short, practical, bullet points for lists.`

    const toolCalls: ToolCall[] = []
    let currentMessages = [...messages]
    const MAX_STEPS = 8

    for (let step = 0; step < MAX_STEPS; step++) {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: systemPrompt,
          tools: [...TOOLS, { type: 'web_search_20250305', name: 'web_search' }],
          messages: currentMessages,
        }),
      })

      if (!anthropicRes.ok) {
        const err = await anthropicRes.text()
        throw new Error(`Anthropic error: ${anthropicRes.status} ${err}`)
      }

      const data = await anthropicRes.json()
      const content = data.content || []

      if (data.stop_reason !== 'tool_use') {
        const text = content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
        return NextResponse.json({ message: text, toolCalls })
      }

      // Execute custom tool_use blocks (skip server tools like web_search that Anthropic runs itself)
      currentMessages.push({ role: 'assistant', content })
      const toolResults: any[] = []
      for (const block of content) {
        if (block.type !== 'tool_use') continue
        // web_search is a server tool — Anthropic handles it, no tool_result needed from us
        if (block.name === 'web_search') continue

        const call: ToolCall = { id: block.id, name: block.name, input: block.input }
        try {
          call.result = await executeTool({ name: block.name, input: block.input }, { siteId, userId: user.id, site, serviceDb })
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(call.result) })
        } catch (e: any) {
          call.error = e.message
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${e.message}`, is_error: true })
        }
        toolCalls.push(call)
      }

      if (toolResults.length === 0) {
        // Only server tools (web_search) were used — let the model continue
        const text = content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
        return NextResponse.json({ message: text, toolCalls })
      }

      currentMessages.push({ role: 'user', content: toolResults })
    }

    return NextResponse.json({ message: 'Reached max tool-use steps. Please rephrase or try again.', toolCalls })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
