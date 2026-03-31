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
  const cleaned = text.replace(/```json|```/g, '').trim()
  try { return JSON.parse(cleaned) } catch {}
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) } catch {}
  }
  throw new Error('Could not parse response as JSON')
}

export async function runSeoAudit(url: string): Promise<AuditResult> {
  const systemPrompt = `You are an expert SEO auditor. You will receive a URL to audit. Analyze the site and return ONLY a valid JSON object — no markdown, no explanation, no extra text.

Required JSON format:
{
  "url": "https://example.com",
  "overall_score": 72,
  "grade": "Needs Work",
  "summary": "Brief one-sentence summary of the site's SEO health",
  "categories": {
    "Technical": 80,
    "Content": 65,
    "On-Page": 70,
    "Performance": 60,
    "Mobile": 85
  },
  "checks": [
    { "status": "pass", "category": "Technical", "title": "SSL Certificate", "detail": "Site uses HTTPS" },
    { "status": "fail", "category": "Content", "title": "Missing Meta Description", "detail": "No meta description found on homepage" }
  ]
}

Grade must be: Excellent (90+), Good (80-89), Needs Work (60-79), or Poor (below 60).
Include 12-15 checks. Status must be exactly: pass, fail, or warn.
Your ENTIRE response must be the JSON object and nothing else.`

  // Step 1: Use web search to gather info about the site
  const searchMessage = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }] as any,
    system: 'You are an SEO researcher. Search for information about the given URL to help with an SEO audit. Search for the site itself and any SEO issues.',
    messages: [{ role: 'user', content: `Search for this URL and gather SEO information about it: ${url}` }],
  })

  // Extract all text from the search response (including tool results)
  const searchContext = searchMessage.content
    .map((b: any) => {
      if (b.type === 'text') return b.text
      if (b.type === 'tool_result') return JSON.stringify(b.content)
      return ''
    })
    .filter(Boolean)
    .join('\n')

  // Step 2: Generate the audit JSON using the search context
  const auditMessage = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Perform a full SEO audit for: ${url}

Here is research gathered about this site:
${searchContext.slice(0, 3000)}

Now produce the JSON audit. Remember: output ONLY the JSON object.`,
      },
    ],
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
    // Last resort: try without web search context
    const fallbackMessage = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Perform a full SEO audit for this URL: ${url}` }],
    })

    const fallbackText = fallbackMessage.content
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
