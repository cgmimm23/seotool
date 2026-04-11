import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://seo.cgmimm.com'

export interface AuditResult {
  url: string
  overall_score: number
  grade: string
  summary: string
  categories: Record<string, number>
  checks: Array<{
    status: 'pass' | 'fail' | 'warn'
    category: string
    title: string
    detail: string
  }>
}

export interface KeywordAnalysis {
  score: number
  verdict: string
  fixes: Array<{
    priority: number
    title: string
    action: string
  }>
}

function parseJSON(text: string): any {
  const cleaned = text.replace(/```json|```/g, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) } catch {}
  }
  throw new Error('Could not parse response as JSON')
}

function buildVerifiedFactsStr(facts: Record<string, any>): string {
  if (!facts.verified) return ''
  return `
VERIFIED TECHNICAL FACTS — confirmed by direct server check. Do NOT contradict these:
- SSL/HTTPS: ${facts.hasSSL ? 'PASS - site uses HTTPS' : 'FAIL - not using HTTPS'}
- Sitemap.xml: ${facts.sitemapExists ? `PASS - found at ${facts.sitemapUrl}` : facts.sitemapInRobots ? `WARN - referenced in robots.txt at ${facts.sitemapUrl}` : `FAIL - not found at ${facts.sitemapUrl}`}
- Robots.txt: ${facts.robotsExists ? 'PASS - robots.txt exists' : 'FAIL - robots.txt not found'}
- Viewport meta tag: ${facts.hasViewport ? 'PASS - mobile viewport tag present' : 'FAIL - missing viewport meta tag'}
- Canonical tag: ${facts.hasCanonical ? 'PASS - canonical tag present' : 'WARN - no canonical tag found'}
- Open Graph tags: ${facts.hasOpenGraph ? 'PASS - OG tags present' : 'WARN - missing Open Graph tags'}
- Schema markup: ${facts.hasSchemaMarkup ? 'PASS - JSON-LD schema found' : 'WARN - no schema markup detected'}
- Meta title: ${facts.hasTitle ? 'PASS - title tag present' : 'FAIL - missing title tag'}
- Meta description: ${facts.hasMetaDescription ? 'PASS - meta description present' : 'FAIL - missing meta description'}
- H1 tag: ${facts.hasH1 ? 'PASS - H1 tag found' : 'WARN - H1 not detected in raw HTML (may be client-side rendered)'}
`
}

export async function runSeoAudit(url: string): Promise<AuditResult> {
  // Fetch verified facts from our own API route (runs server-side with full network access)
  let facts: Record<string, any> = {}
  try {
    const verifyRes = await fetch(`${SITE_URL}/api/verify-site?url=${encodeURIComponent(url)}`)
    if (verifyRes.ok) facts = await verifyRes.json()
  } catch {}

  // Web search for additional context
  let searchContext = ''
  try {
    const searchMessage = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
      system: 'You are an SEO researcher. Search for information about the given URL.',
      messages: [{ role: 'user', content: `Search for SEO information about: ${url}` }],
    })
    searchContext = searchMessage.content
      .map((b: any) => b.type === 'text' ? b.text : b.type === 'tool_result' ? JSON.stringify(b.content) : '')
      .filter(Boolean).join('\n').slice(0, 2000)
  } catch {}

  const verifiedFactsStr = buildVerifiedFactsStr(facts)

  const systemPrompt = `You are an expert SEO auditor. Return ONLY a valid JSON object — no markdown, no explanation, no extra text.

Required format:
{
  "url": "https://example.com",
  "overall_score": 72,
  "grade": "Needs Work",
  "summary": "Brief one-sentence summary",
  "categories": { "Technical": 80, "Content": 65, "On-Page": 70, "Performance": 60, "Mobile": 85 },
  "checks": [
    { "status": "pass", "category": "Technical", "title": "SSL Certificate", "detail": "Site uses HTTPS" }
  ]
}

Grade: Excellent (90+), Good (80-89), Needs Work (60-79), Poor (below 60).
Include 12-15 checks. Status: pass, fail, or warn only.
${verifiedFactsStr ? 'CRITICAL: The verified facts below are confirmed true. You MUST reflect them accurately in your checks.' : ''}
Your entire response must be only the JSON object.`

  const auditMessage = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Full SEO audit for: ${url}
${verifiedFactsStr}
Additional web research:
${searchContext}

Output ONLY the JSON object.`,
    }],
  })

  const allText = auditMessage.content
    .filter((b) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')

  try {
    const result = parseJSON(allText)
    return {
      url: result.url || url,
      overall_score: result.overall_score || result.overall || 50,
      grade: result.grade || 'Unknown',
      summary: result.summary || '',
      categories: result.categories || {},
      checks: result.checks || [],
    }
  } catch {
    const fallback = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `SEO audit for: ${url}\n${verifiedFactsStr}\nOutput ONLY the JSON.` }],
    })
    const fallbackText = fallback.content
      .filter((b) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')
    try {
      const result = parseJSON(fallbackText)
      return {
        url: result.url || url,
        overall_score: result.overall_score || result.overall || 50,
        grade: result.grade || 'Unknown',
        summary: result.summary || '',
        categories: result.categories || {},
        checks: result.checks || [],
      }
    } catch {
      return {
        url,
        overall_score: 50,
        grade: 'Unknown',
        summary: 'Audit completed but response could not be parsed. Please try again.',
        categories: { Technical: 50, Content: 50, 'On-Page': 50, Performance: 50, Mobile: 50 },
        checks: [],
      }
    }
  }
}

export async function analyzeKeywords(
  url: string,
  pagePath: string,
  keywords: string[]
): Promise<KeywordAnalysis> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: `You are an SEO expert. Analyze keyword optimization. Return ONLY valid JSON.

Schema:
{
  "score": 72,
  "verdict": "one sentence summary",
  "fixes": [{ "priority": 1, "title": "Fix title tag", "action": "Specific actionable instruction" }]
}

Include 5-8 fixes ordered by SEO impact. Your entire response must be the JSON object only.`,
    messages: [{
      role: 'user',
      content: `URL: ${url}${pagePath}\nTarget keywords: ${keywords.join(', ')}\n\nWhat changes should be made?`,
    }],
  })

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')

  try {
    return parseJSON(text)
  } catch {
    throw new Error('Could not parse keyword analysis response')
  }
}
