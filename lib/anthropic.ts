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
    explanation?: string
    how_to_fix?: string
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

export interface PageOptimizationIdea {
  impact: 'high' | 'medium' | 'low'
  title: string
  detail: string
  how_to_fix: string
}

export interface PageOptimizationResult {
  optimization_score: number
  summary: string
  ideas: Record<string, PageOptimizationIdea[]>
}

export interface KeywordStrategyResult {
  summary: string
  core_phrases: Array<{
    phrase: string
    intent: string
    difficulty: 'easy' | 'medium' | 'hard'
    target_page: string
    rationale: string
    optimization_notes: string
  }>
  long_tail_clusters: Array<{
    cluster_name: string
    parent_core_phrase: string
    phrases: Array<{
      phrase: string
      intent: string
      suggested_page_type: string
    }>
  }>
  deployment_strategy: {
    pillar_pages: string[]
    cluster_content: string[]
    internal_linking: string[]
    tags_and_categories: string[]
    schema_markup: string[]
    priority_order: string[]
  }
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
  const perfLine = (label: string, p: any) => {
    if (!p || p.score === null || p.score === undefined) return `- PageSpeed ${label}: NOT MEASURED`
    const status = p.score >= 90 ? 'PASS' : p.score >= 50 ? 'WARN' : 'FAIL'
    return `- PageSpeed ${label}: ${status} — real measured score ${p.score}/100${p.lcp ? ` (LCP ${p.lcp})` : ''}${p.cls ? ` (CLS ${p.cls})` : ''}${p.tbt ? ` (TBT ${p.tbt})` : ''}`
  }
  return `
VERIFIED TECHNICAL FACTS — confirmed by direct server check. You MUST mirror these exactly. If a fact is PASS, your check for it MUST be "pass" and you MUST NOT use hedging language like "needs review", "flagged for review", "should verify", "needs verification", "potential issue", or "worth checking". Only "warn" or "fail" on items marked WARN or FAIL below.
- SSL/HTTPS: ${facts.hasSSL ? 'PASS - site uses HTTPS' : 'FAIL - not using HTTPS'}
- Sitemap: ${facts.sitemapExists ? `PASS - sitemap.xml exists at ${facts.sitemapUrl}` : facts.sitemapInRobots ? `PASS - sitemap referenced in robots.txt at ${facts.sitemapUrl}` : `FAIL - no sitemap found`}
- Robots.txt: ${facts.robotsExists ? 'PASS - robots.txt exists' : 'FAIL - robots.txt not found'}
- Viewport meta tag: ${facts.hasViewport ? 'PASS - mobile viewport tag present' : 'FAIL - missing viewport meta tag'}
- Canonical tag: ${facts.hasCanonical ? 'PASS - canonical tag present' : 'WARN - no canonical tag found'}
- Open Graph tags: ${facts.hasOpenGraph ? 'PASS - OG tags present' : 'WARN - missing Open Graph tags'}
- Schema markup: ${facts.hasSchemaMarkup ? 'PASS - JSON-LD schema found' : 'WARN - no schema markup detected'}
- Meta title: ${facts.hasTitle ? 'PASS - title tag present' : 'FAIL - missing title tag'}
- Meta description: ${facts.hasMetaDescription ? 'PASS - meta description present' : 'FAIL - missing meta description'}
- H1 tag: ${facts.hasH1 ? 'PASS - H1 tag found' : 'WARN - H1 not detected in raw HTML (may be client-side rendered)'}
${perfLine('Mobile', facts.pagespeedMobile)}
${perfLine('Desktop', facts.pagespeedDesktop)}
`
}

const SITE_TYPE_LABELS: Record<string, string> = {
  local_service: 'local service business (e.g. roofing, plumbing, HVAC, landscaping — depends on local SEO, GBP, service-area pages, reviews, trust signals)',
  ecommerce: 'ecommerce / online store (depends on product schema, category pages, site search, cart UX, reviews, shipping info, secure checkout)',
  blog_publisher: 'blog or publisher (depends on content freshness, author E-E-A-T signals, topical authority, internal linking, reader engagement)',
  law_firm: 'law firm (depends on practice area pages, local SEO, E-E-A-T / author bios, case results, testimonials, compliance)',
  medical_dental: 'medical or dental practice (depends on local SEO, practitioner bios with credentials, HIPAA-safe content, YMYL trust signals, appointment booking)',
  restaurant_food: 'restaurant or food service (depends on menu schema, hours, reservations, photos, location data, reviews, local search)',
  real_estate: 'real estate (depends on property schema, location pages, agent bios, IDX integration, local SEO, lead capture)',
  saas_software: 'SaaS / software product (depends on feature pages, pricing transparency, docs/help content, conversion optimization, programmatic SEO)',
  professional_services: 'professional services / agency / consulting (depends on service pages, case studies, author E-E-A-T, lead magnets, conversion paths)',
  nonprofit: 'nonprofit (depends on mission/impact content, donation flows, trust signals, board/leadership bios, storytelling)',
  educational: 'educational site / school / course (depends on curriculum pages, instructor bios, accreditation info, local signals if physical campus)',
  portfolio_personal: 'portfolio / personal brand (depends on project showcase, about page, contact/hire flow, author authority signals)',
  other: 'general website',
}

const PLATFORM_LABELS: Record<string, string> = {
  wordpress: 'WordPress — fix instructions should reference the WordPress admin (Pages, Posts, Appearance > Theme Editor, Settings > Reading/Permalinks). Recommend Yoast SEO or Rank Math for meta tag / schema work. Note plugins like WP Rocket for caching, Smush for images.',
  wix: 'Wix — fix instructions should reference Wix Editor/Studio: site dashboard > Marketing & SEO > SEO Tools, page-level SEO panel, Wix SEO Wiz. Note limited custom code unless using Velo. Schema via SEO Tools or custom code.',
  squarespace: 'Squarespace — fix instructions should reference the Home menu > Marketing > SEO, page settings > SEO panel, and individual page or product SEO panels. Limited custom code via code injection.',
  shopify: 'Shopify — fix instructions should reference Online Store > Preferences (meta), product/collection SEO fields, theme code (Liquid templates) for structured data. Suggest Shopify SEO apps if needed.',
  webflow: 'Webflow — fix instructions should reference Project Settings > SEO, page settings > SEO & Open Graph, and Designer custom code panel for schema. CMS items have dedicated SEO fields.',
  duda: 'Duda — fix instructions should reference SEO Overview panel, page-level SEO settings, header/footer HTML panels for schema, and Duda widgets. Limited plugin ecosystem.',
  godaddy: 'GoDaddy Website Builder — fix instructions should reference GoDaddy site editor SEO settings (limited). Many advanced SEO items require moving to a CMS with more control — flag this when relevant.',
  hubspot: 'HubSpot CMS — fix instructions should reference HubSpot Content tools, page SEO panel, blog settings, and structured data templates. Integration with HubSpot CRM.',
  custom_code: 'custom-coded site / framework (Next.js, React, Astro, static, etc.) — fix instructions should reference code changes: <head> tags, meta tags, JSON-LD schema in markup, robots.txt/sitemap generation in code.',
  other: 'unknown CMS / platform',
}

export async function runSeoAudit(
  url: string,
  siteType?: string | null,
  platform?: string | null,
  auditNotes?: string | null,
): Promise<AuditResult> {
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
  const siteTypeKey = (siteType || '').toLowerCase()
  const siteTypeDescription = SITE_TYPE_LABELS[siteTypeKey]
  const platformKey = (platform || '').toLowerCase()
  const platformDescription = PLATFORM_LABELS[platformKey]
  const contextLines: string[] = []
  if (siteTypeDescription) {
    contextLines.push(`SITE TYPE: This site is a ${siteTypeDescription}. Tailor every "explanation" and "how_to_fix" to this business type. Prioritize checks that matter most for this type of site.`)
  }
  if (platformDescription) {
    contextLines.push(`PLATFORM: ${platformDescription} — every "how_to_fix" must use this platform's specific interface and terminology. Do NOT give generic HTML/code instructions when the platform has its own SEO panel.`)
  }
  if (auditNotes && auditNotes.trim()) {
    contextLines.push(`USER-PROVIDED NOTES — the site owner has written these to correct things prior audits got wrong or to provide context. Treat these as authoritative. Do not contradict them:\n${auditNotes.trim()}`)
  }
  const siteContextStr = contextLines.length ? `\n${contextLines.join('\n\n')}\n` : ''

  const systemPrompt = `You are an expert SEO auditor. Return ONLY a valid JSON object — no markdown, no explanation, no extra text.

Required format:
{
  "url": "https://example.com",
  "overall_score": 72,
  "grade": "Needs Work",
  "summary": "Brief one-sentence summary",
  "categories": { "Technical": 80, "Content": 65, "On-Page": 70, "Performance": 60, "Mobile": 85 },
  "checks": [
    {
      "status": "pass",
      "category": "Technical",
      "title": "SSL Certificate",
      "detail": "Site uses HTTPS",
      "explanation": "2-4 sentence paragraph explaining WHY this matters for SEO, user trust, or rankings. Be specific to this site's situation if possible. Reference concrete impact (search ranking, user experience, indexing, conversion).",
      "how_to_fix": "Clear step-by-step instructions to fix or improve this. Use numbered steps (1., 2., 3.). Be specific and actionable — include tool/setting names, code snippets, or URLs where relevant. If the check already passes, use this field for 'Maintenance tips' instead."
    }
  ]
}

Grade: Excellent (90+), Good (80-89), Needs Work (60-79), Poor (below 60).
Include 12-15 checks. Status: pass, fail, or warn only.
EVERY check MUST include all fields: status, category, title, detail, explanation, how_to_fix. Never omit explanation or how_to_fix.
The "explanation" and "how_to_fix" fields should be detailed and actionable — imagine a site owner with no SEO knowledge reading them and needing to fix the issue themselves.
${siteContextStr}${verifiedFactsStr ? 'CRITICAL: The verified facts below are confirmed true. You MUST reflect them accurately in your checks.' : ''}
Your entire response must be only the JSON object.`

  const auditMessage = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
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
      max_tokens: 8000,
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

export async function analyzePageOptimization(
  pageUrl: string,
  keyword: string,
  secondaryKeywords: string[] = [],
  competitors: Array<{ position: number; title: string; link: string; snippet: string }> = [],
  platform?: string | null,
  siteType?: string | null,
): Promise<PageOptimizationResult> {
  // Fetch the page HTML server-side
  let pageHtml = ''
  let pageTitle = ''
  let pageMetaDescription = ''
  let pageH1 = ''
  let pageWordCount = 0
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO-CGMIMM-Audit/1.0)' },
      next: { revalidate: 0 },
    })
    if (res.ok) {
      pageHtml = await res.text()
      pageTitle = pageHtml.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || ''
      pageMetaDescription = pageHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim() || ''
      pageH1 = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() || ''
      const bodyText = pageHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      pageWordCount = bodyText.split(' ').filter(Boolean).length
    }
  } catch {}

  const platformKey = (platform || '').toLowerCase()
  const platformDesc = PLATFORM_LABELS[platformKey]
  const siteTypeKey = (siteType || '').toLowerCase()
  const siteTypeDesc = SITE_TYPE_LABELS[siteTypeKey]

  const contextLines: string[] = []
  if (platformDesc) contextLines.push(`PLATFORM: ${platformDesc}`)
  if (siteTypeDesc) contextLines.push(`SITE TYPE: ${siteTypeDesc}`)
  const contextStr = contextLines.length ? `\n${contextLines.join('\n\n')}\n` : ''

  const competitorsBlock = competitors.length
    ? `\nTop ${competitors.length} ranking competitors for "${keyword}":\n${competitors.map(c => `${c.position}. ${c.title}\n   ${c.link}\n   ${c.snippet || ''}`).join('\n')}\n`
    : ''

  const systemPrompt = `You are an expert on-page SEO analyst. Return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

Required format:
{
  "optimization_score": 68,
  "summary": "one-sentence summary of how well the page is optimized for the target keyword",
  "ideas": {
    "Content": [
      {
        "impact": "high",
        "title": "Keyword is missing from H1",
        "detail": "one-sentence observation — what's wrong or missing",
        "how_to_fix": "step-by-step, platform-specific instructions. Use numbered steps."
      }
    ],
    "Semantic": [ ... ],
    "Strategy": [ ... ],
    "Technical": [ ... ],
    "Competitive": [ ... ],
    "User Experience": [ ... ]
  }
}

Score from 0-100 based on how well the page is optimized for the target keyword, considering:
- Is the keyword in the title tag, H1, and first 100 words?
- Is the meta description compelling and keyword-relevant?
- How does word count compare to top competitors?
- Does the page cover the semantic/related terms the top rankers use?
- Is there schema markup relevant to this content?
- Is the content structure (H2s, H3s) aligned with search intent?
- Are there internal links supporting this page?
- Is search intent matched (informational vs commercial vs navigational)?

EVERY idea MUST include: impact (high/medium/low), title, detail, how_to_fix. Every how_to_fix must be specific and platform-aware.
Group ideas by category. Only include categories with at least one idea. Prioritize the highest-impact ideas.
${contextStr}
Your entire response must be only the JSON object.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Analyze this page for optimization against its target keyword.

Page URL: ${pageUrl}
Target keyword: "${keyword}"
${secondaryKeywords.length ? `Secondary keywords: ${secondaryKeywords.map(k => `"${k}"`).join(', ')}` : ''}

Extracted page signals:
- Title tag: ${pageTitle || '(not found)'}
- Meta description: ${pageMetaDescription || '(not found)'}
- H1: ${pageH1 || '(not found)'}
- Approx word count: ${pageWordCount}
${competitorsBlock}
Output ONLY the JSON object.`,
    }],
  })

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')

  try {
    const parsed = parseJSON(text)
    return {
      optimization_score: parsed.optimization_score || parsed.score || 50,
      summary: parsed.summary || '',
      ideas: parsed.ideas || {},
    }
  } catch {
    throw new Error('Could not parse page optimization response')
  }
}

export async function generateKeywordStrategy(
  url: string,
  siteType?: string | null,
  platform?: string | null,
  auditNotes?: string | null,
): Promise<KeywordStrategyResult> {
  // Fetch the homepage HTML for business context
  let homepageText = ''
  let homepageTitle = ''
  let homepageDescription = ''
  let homepageH1 = ''
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO-CGMIMM-Strategy/1.0)' },
      next: { revalidate: 0 },
    })
    if (res.ok) {
      const html = await res.text()
      homepageTitle = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || ''
      homepageDescription = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim() || ''
      homepageH1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() || ''
      const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      homepageText = bodyText.slice(0, 5000)
    }
  } catch {}

  const siteTypeKey = (siteType || '').toLowerCase()
  const siteTypeDesc = SITE_TYPE_LABELS[siteTypeKey]
  const platformKey = (platform || '').toLowerCase()
  const platformDesc = PLATFORM_LABELS[platformKey]

  const contextLines: string[] = []
  if (siteTypeDesc) contextLines.push(`SITE TYPE: ${siteTypeDesc}`)
  if (platformDesc) contextLines.push(`PLATFORM: ${platformDesc}`)
  if (auditNotes && auditNotes.trim()) contextLines.push(`USER NOTES (authoritative): ${auditNotes.trim()}`)
  const contextStr = contextLines.length ? `\n${contextLines.join('\n\n')}\n` : ''

  const systemPrompt = `You are an expert SEO strategist specializing in topic cluster / hub-and-spoke keyword architecture. Return ONLY a valid JSON object — no markdown, no explanation outside the JSON.

Required format:
{
  "summary": "One paragraph on the site's competitive positioning and where its biggest keyword opportunities lie.",
  "core_phrases": [
    {
      "phrase": "the head term (2-4 words typically)",
      "intent": "commercial|informational|local|transactional|navigational",
      "difficulty": "easy|medium|hard",
      "target_page": "which page should anchor this (homepage URL, existing service page URL, or 'needs new pillar page')",
      "rationale": "1-2 sentences on why this phrase matters for this specific business",
      "optimization_notes": "concrete changes to make on the target page: title, H1, first 100 words, schema, internal links."
    }
  ],
  "long_tail_clusters": [
    {
      "cluster_name": "Human-readable theme name",
      "parent_core_phrase": "which core phrase this cluster supports (must match a phrase in core_phrases exactly)",
      "phrases": [
        {
          "phrase": "specific long-tail query",
          "intent": "commercial|informational|local|transactional",
          "suggested_page_type": "blog post|service page|FAQ|location page|pricing page|comparison page|glossary"
        }
      ]
    }
  ],
  "deployment_strategy": {
    "pillar_pages": ["action item — what pillar page to create or optimize, which URL"],
    "cluster_content": ["action item — what blog post / service page / etc. to publish, with target long-tail"],
    "internal_linking": ["action item — which pages should link to which, with anchor text suggestions"],
    "tags_and_categories": ["platform-specific tag/category/taxonomy recommendations"],
    "schema_markup": ["which schema type to add to which page type"],
    "priority_order": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
  }
}

Rules:
- 3-5 core phrases — not more. These are the pillars the whole strategy hangs on.
- Each core phrase should have its own long-tail cluster (12-20 phrases per cluster).
- Long-tail phrases should be specific, realistic queries a real user would type — NOT keyword-stuffed combinations.
- Mix intents: commercial/transactional for money pages, informational for blog content that earns links.
- tags_and_categories MUST be platform-specific — reference the actual taxonomy system of the platform the user is on (WordPress categories/tags, Shopify collections, Wix tags, Webflow CMS collections, etc.).
- priority_order should be a concrete sequenced checklist (10-15 steps max) the user can work through this month/quarter.
${contextStr}
Your entire response must be only the JSON object.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Build a keyword strategy for this site.

URL: ${url}
Homepage title: ${homepageTitle || '(not found)'}
Meta description: ${homepageDescription || '(not found)'}
H1: ${homepageH1 || '(not found)'}

Homepage content (first 5000 chars, HTML stripped):
${homepageText || '(could not fetch)'}

Output ONLY the JSON object.`,
    }],
  })

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')

  try {
    const parsed = parseJSON(text)
    return {
      summary: parsed.summary || '',
      core_phrases: parsed.core_phrases || [],
      long_tail_clusters: parsed.long_tail_clusters || [],
      deployment_strategy: parsed.deployment_strategy || {
        pillar_pages: [],
        cluster_content: [],
        internal_linking: [],
        tags_and_categories: [],
        schema_markup: [],
        priority_order: [],
      },
    }
  } catch {
    throw new Error('Could not parse keyword strategy response')
  }
}
