import { NextRequest, NextResponse } from 'next/server'

function extractMeta(html: string, tag: string): string | null {
  const p1 = new RegExp(`<meta[^>]+name=["']${tag}["'][^>]+content=["']([^"']+)["']`, 'i')
  const p2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${tag}["']`, 'i')
  const m = html.match(p1) || html.match(p2)
  return m ? m[1].trim() : null
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m ? m[1].trim() : null
}

function extractH1(html: string): string | null {
  // Match everything between <h1...> and </h1>, then strip all inner tags
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (!m) return null
  const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > 0 ? text : null
}

function countH2(html: string): number {
  return (html.match(/<h2[^>]*>/gi) || []).length
}

function extractHeadingText(html: string, tag: string): string | null {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (!m) return null
  const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > 0 ? text : null
}

function countHeadings(html: string, tag: string): number {
  return (html.match(new RegExp(`<${tag}[^>]*>`, 'gi')) || []).length
}

function extractCanonical(html: string): string | null {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)
  return m ? m[1].trim() : null
}

function countImages(html: string): { total: number; noAlt: number } {
  const imgs = html.match(/<img[^>]+>/gi) || []
  const noAlt = imgs.filter((img: string) => {
    // Has standard alt with non-empty value — OK
    if (img.match(/\balt=["'][^"']+["']/i)) return false
    // Has data-alt (used by some CMSs like WordPress) — OK
    if (img.match(/\bdata-alt=["'][^"']+["']/i)) return false
    // Has aria-label — OK
    if (img.match(/\baria-label=["'][^"']+["']/i)) return false
    // Has title attribute as accessible fallback — OK
    if (img.match(/\btitle=["'][^"']+["']/i)) return false
    // Intentionally empty alt (decorative image) — OK, not an error
    if (img.match(/\balt=["']["']/i)) return false
    // Tracking pixel (1x1) — skip
    if (img.match(/width=["']1["']/i) && img.match(/height=["']1["']/i)) return false
    return true
  }).length
  return { total: imgs.length, noAlt }
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.split(' ').filter((w: string) => w.length > 2).length
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const domain = new URL(baseUrl).origin
  const links: string[] = []
  const seen = new Set<string>()
  const pattern = /href=["']([^"'#?]+)["']/gi
  let match = pattern.exec(html)
  while (match !== null && links.length < 30) {
    let href = match[1].trim()
    if (href.startsWith('/')) href = domain + href
    const clean = href.replace(/\/$/, '') || domain
    if (
      href.startsWith(domain) &&
      !seen.has(clean) &&
      !href.match(/\.(pdf|jpg|jpeg|png|gif|svg|webp|css|js|ico|xml|txt)$/i)
    ) {
      seen.add(clean)
      links.push(clean)
    }
    match = pattern.exec(html)
  }
  return links
}

function isCanonicalRedirect(originalUrl: string, finalUrl: string): boolean {
  try {
    const orig = new URL(originalUrl)
    const final = new URL(finalUrl)
    // Same hostname (with or without www) and same path = canonical redirect
    const origHost = orig.hostname.replace(/^www\./, '')
    const finalHost = final.hostname.replace(/^www\./, '')
    const origPath = orig.pathname.replace(/\/$/, '') || '/'
    const finalPath = final.pathname.replace(/\/$/, '') || '/'
    // http -> https or non-www -> www on same path = canonical, not a problem
    if (origHost === finalHost && origPath === finalPath) return true
    return false
  } catch {
    return false
  }
}

function analyzeIssues(data: any, originalUrl: string): string[] {
  const issues: string[] = []
  if (!data.title) issues.push('Missing meta title')
  else if (data.title.length < 30) issues.push('Meta title too short (under 30 chars)')
  else if (data.title.length > 60) issues.push('Meta title too long (over 60 chars)')
  if (!data.description) issues.push('Missing meta description')
  else if (data.description.length < 120) issues.push('Meta description too short (under 120 chars)')
  else if (data.description.length > 160) issues.push('Meta description too long (over 160 chars)')
  if (!data.h1) issues.push('H1 not detected in raw HTML (may be client-side rendered)')
  if (data.h2Count === 0) issues.push('No H2 tags detected in raw HTML (may be client-side rendered)')
  if (data.wordCount < 300) issues.push('Thin content (' + data.wordCount + ' words)')
  if (data.imagesNoAlt > 0) issues.push(data.imagesNoAlt + ' image' + (data.imagesNoAlt > 1 ? 's' : '') + ' missing alt text')
  // Only flag redirects that are NOT canonical (non-www->www, http->https)
  if (data.isRedirect && data.redirectTo && !isCanonicalRedirect(originalUrl, data.redirectTo)) {
    issues.push('Unexpected redirect to ' + data.redirectTo)
  }
  if (data.canonical && data.canonical !== data.url && !isCanonicalRedirect(data.url, data.canonical)) {
    issues.push('Canonical points to different URL')
  }
  if (data.status === 404) issues.push('Page returns 404')
  if (data.status === 500) issues.push('Page returns 500 server error')
  return issues
}

export async function POST(request: NextRequest) {
  let url = ''
  try {
    const body = await request.json()
    url = body.url
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    const start = Date.now()
    let finalUrl = url
    let isRedirect = false
    let redirectTo: string | null = null
    let status = 200

    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Marketing-Machine-SEO-Crawler/1.0' },
      signal: AbortSignal.timeout(10000),
    })

    status = res.status
    if (res.url !== url) {
      isRedirect = true
      redirectTo = res.url
      finalUrl = res.url
    }

    let html = ''
    if (res.ok) html = await res.text()

    const title = extractTitle(html)
    const description = extractMeta(html, 'description')
    const h1 = extractH1(html)
    const h2Count = countHeadings(html, 'h2')
    const h3Count = countHeadings(html, 'h3')
    const h4Count = countHeadings(html, 'h4')
    const h5Count = countHeadings(html, 'h5')
    const canonical = extractCanonical(html)
    const { total: images, noAlt: imagesNoAlt } = countImages(html)
    const wordCount = countWords(html)
    const internalLinks = extractInternalLinks(html, url)
    const loadTime = Date.now() - start

    const pageData: any = {
      url: finalUrl,
      status,
      title,
      description,
      h1,
      h2Count,
      h3Count,
      h4Count,
      h5Count,
      wordCount,
      canonical,
      images,
      imagesNoAlt,
      isRedirect,
      redirectTo,
      loadTime,
      issues: [],
      internalLinks,
    }

    pageData.issues = analyzeIssues(pageData, url)

    return NextResponse.json({ page: pageData })
  } catch (err: any) {
    return NextResponse.json({
      page: {
        url,
        status: 0,
        title: null,
        description: null,
        h1: null,
        h2Count: 0,
        wordCount: 0,
        canonical: null,
        images: 0,
        imagesNoAlt: 0,
        isRedirect: false,
        redirectTo: null,
        loadTime: 0,
        issues: ['Could not fetch page: ' + err.message],
        internalLinks: [],
      }
    })
  }
}
