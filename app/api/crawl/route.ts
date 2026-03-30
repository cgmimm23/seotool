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
  const m = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : null
}

function countH2(html: string): number {
  return (html.match(/<h2[^>]*>/gi) || []).length
}

function extractCanonical(html: string): string | null {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)
  return m ? m[1].trim() : null
}

function countImages(html: string): { total: number; noAlt: number } {
  const imgs = html.match(/<img[^>]+>/gi) || []
  const noAlt = imgs.filter((img: string) => !img.match(/alt=["'][^"']+["']/i)).length
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

function analyzeIssues(data: any): string[] {
  const issues: string[] = []
  if (!data.title) issues.push('Missing meta title')
  else if (data.title.length < 30) issues.push('Meta title too short (under 30 chars)')
  else if (data.title.length > 60) issues.push('Meta title too long (over 60 chars)')
  if (!data.description) issues.push('Missing meta description')
  else if (data.description.length < 120) issues.push('Meta description too short (under 120 chars)')
  else if (data.description.length > 160) issues.push('Meta description too long (over 160 chars)')
  if (!data.h1) issues.push('Missing H1 tag')
  if (data.h2Count === 0) issues.push('No H2 tags found')
  if (data.wordCount < 300) issues.push('Thin content (' + data.wordCount + ' words)')
  if (data.imagesNoAlt > 0) issues.push(data.imagesNoAlt + ' image' + (data.imagesNoAlt > 1 ? 's' : '') + ' missing alt text')
  if (data.isRedirect) issues.push('Redirects to ' + data.redirectTo)
  if (data.canonical && data.canonical !== data.url) issues.push('Canonical points to different URL')
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
    const h2Count = countH2(html)
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

    pageData.issues = analyzeIssues(pageData)

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
