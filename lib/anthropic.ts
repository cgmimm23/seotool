import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface AuditResult {
  url: string
  overall: number
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

export async function runSeoAudit(url: string): Promise<AuditResult> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
    system: `You are an expert SEO auditor. Use web_search to fetch and analyze the page. Return ONLY valid JSON — no markdown, no backticks, no explanation.

Schema:
{
  "url": "",
  "overall": 72,
  "grade": "Good",
  "summary": "one sentence",
  "categories": { "Technical": 80, "Content": 65, "On-Page": 70, "Performance": 60, "Mobile": 85 },
  "checks": [
    { "status": "pass|fail|warn", "category": "Technical|Content|On-Page|Performance|Mobile", "title": "", "detail": "" }
  ]
}

Include 14-18 checks covering: meta title, meta description, h1, h2s, canonical, robots.txt, sitemap, image alt, page speed signals, mobile viewport, structured data, internal links, SSL, open graph, Twitter cards, keyword usage. Be accurate from actual page content found.`,
    messages: [{ role: 'user', content: `Full SEO audit: ${url}` }],
  })

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')

  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Could not parse audit response')
  }
}

export async function analyzeKeywords(
  url: string,
  pagePath: string,
  keywords: string[]
): Promise<KeywordAnalysis> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: `You are an SEO expert. Analyze a page's keyword optimization. Return ONLY valid JSON.

Schema:
{
  "score": 72,
  "verdict": "one sentence summary",
  "fixes": [
    { "priority": 1, "title": "Fix title tag", "action": "Specific actionable instruction" }
  ]
}

Include 5-8 fixes ordered by SEO impact. Be specific — name exact changes to make.`,
    messages: [
      {
        role: 'user',
        content: `URL: ${url}${pagePath}
Target keywords: ${keywords.join(', ')}

What specific changes should be made to optimize this page for these keywords?`,
      },
    ],
  })

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')

  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Could not parse keyword analysis response')
  }
}
