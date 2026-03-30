import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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
  // Try direct parse first
  const cleaned = text.replace(/```json|```/g, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  // Try to extract JSON object
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) } catch {}
  }
  throw new Error('Could not parse response as JSON')
}

export async function runSeoAudit(url: string): Promise<AuditResult> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    system: `You are an expert SEO auditor. Use web_search to fetch and analyze the page. Return ONLY valid JSON — no markdown, no backticks, no explanation, no preamble.

Schema:
{
  "url": "",
  "overall_score": 72,
  "grade": "Good",
  "summary": "one sentence",
  "categories": { "Technical": 80, "Content": 65, "On-Page": 70, "Performance": 60, "Mobile": 85 },
  "checks": [
    { "status": "pass", "category": "Technical", "title": "", "detail": "" },
    { "status": "fail", "category": "Content", "title": "", "detail": "" },
    { "status": "warn", "category": "On-Page", "title": "", "detail": "" }
  ]
}

Include 14-18 checks covering: meta title, meta description, h1, h2s, canonical, robots.txt, sitemap, image alt, page speed signals, mobile viewport, structured data, internal links, SSL, open graph, Twitter cards, keyword usage. Your ENTIRE response must be the JSON object and nothing else.`,
    messages: [{ role: 'user', content: `Full SEO audit: ${url}` }],
  })

  // Get all text blocks including after tool use
  const allText = message.content
    .filter((b) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')

  try {
    const result = parseJSON(allText)
    // Normalize field names
    return {
      url: result.url || url,
      overall_score: result.overall_score || result.overall || 50,
      grade: result.grade || 'Unknown',
      summary: result.summary || '',
      categories: result.categories || {},
      checks: result.checks || [],
    }
  } catch {
    throw new Error('Could not parse audit response. Please try again.')
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
    system: `You are an SEO expert. Analyze a page's keyword optimization. Return ONLY valid JSON, no markdown, no explanation.

Schema:
{
  "score": 72,
  "verdict": "one sentence summary",
  "fixes": [
    { "priority": 1, "title": "Fix title tag", "action": "Specific actionable instruction" }
  ]
}

Include 5-8 fixes ordered by SEO impact. Your ENTIRE response must be the JSON object and nothing else.`,
    messages: [
      {
        role: 'user',
        content: `URL: ${url}${pagePath}\nTarget keywords: ${keywords.join(', ')}\n\nWhat specific changes should be made to optimize this page for these keywords?`,
      },
    ],
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
