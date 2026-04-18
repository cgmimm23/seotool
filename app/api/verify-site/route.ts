import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const facts: Record<string, any> = {}

  try {
    const base = new URL(url.startsWith('http') ? url : 'https://' + url)
    const origin = base.origin

    const [sitemapRes, robotsRes, homepageRes] = await Promise.allSettled([
      fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(6000) }),
      fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(6000) }),
      fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Marketing-Machine-SEO-Auditor/1.0' } }),
    ])

    // Sitemap
    facts.sitemapExists = sitemapRes.status === 'fulfilled' && sitemapRes.value.ok
    facts.sitemapUrl = `${origin}/sitemap.xml`

    // Robots.txt
    if (robotsRes.status === 'fulfilled' && robotsRes.value.ok) {
      facts.robotsExists = true
      const robotsText = await robotsRes.value.text()
      if (!facts.sitemapExists) {
        facts.sitemapInRobots = /sitemap:/i.test(robotsText)
        const sitemapMatch = robotsText.match(/sitemap:\s*(\S+)/i)
        if (sitemapMatch) facts.sitemapUrl = sitemapMatch[1]
      }
    } else {
      facts.robotsExists = false
    }

    // Homepage
    if (homepageRes.status === 'fulfilled' && homepageRes.value.ok) {
      const html = await homepageRes.value.text()
      facts.hasSSL = origin.startsWith('https')
      facts.hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html)
      facts.hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html)
      facts.hasOpenGraph = /<meta[^>]+property=["']og:/i.test(html)
      facts.hasSchemaMarkup = /application\/ld\+json/i.test(html)
      facts.hasTitle = /<title[^>]*>[^<]+<\/title>/i.test(html)
      facts.hasMetaDescription = /<meta[^>]+name=["']description["']/i.test(html)
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
      facts.hasH1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim().length > 0 : false
      facts.verified = true
    }

    // Real PageSpeed Insights — mobile + desktop — so the AI can't guess on perf
    const pagespeedKey = process.env.NEXT_PUBLIC_PAGESPEED_API_KEY
    if (pagespeedKey) {
      const pageSpeedCall = async (strategy: 'mobile' | 'desktop') => {
        const params = new URLSearchParams({
          url,
          strategy,
          key: pagespeedKey,
          category: 'performance',
        })
        const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, {
          signal: AbortSignal.timeout(60000),
        })
        if (!r.ok) return null
        const j = await r.json()
        const score = j.lighthouseResult?.categories?.performance?.score
        const lcp = j.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue
        const cls = j.lighthouseResult?.audits?.['cumulative-layout-shift']?.displayValue
        const tbt = j.lighthouseResult?.audits?.['total-blocking-time']?.displayValue
        return { score: score !== undefined ? Math.round(score * 100) : null, lcp, cls, tbt }
      }
      const [mobile, desktop] = await Promise.all([
        pageSpeedCall('mobile').catch(() => null),
        pageSpeedCall('desktop').catch(() => null),
      ])
      if (mobile) facts.pagespeedMobile = mobile
      if (desktop) facts.pagespeedDesktop = desktop
    }
  } catch (err: any) {
    facts.error = err.message
  }

  return NextResponse.json(facts)
}
