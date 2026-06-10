import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { analyzePageOptimization } from '@/lib/anthropic'
import { fetchSerpResults } from '@/lib/serpapi'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { siteId, pageUrl, keyword, secondaryKeywords } = await request.json()
    if (!siteId || !pageUrl || !keyword) {
      return NextResponse.json({ error: 'siteId, pageUrl, and keyword are required' }, { status: 400 })
    }

    // Pull site context for platform + type — scoped to the caller's site.
    const site = await prisma.sites.findFirst({
      where: { id: siteId, user_id: user.id },
      select: { platform: true, site_type: true },
    })
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

    // Fetch top SERP competitors (best-effort — don't block if SerpAPI is unavailable)
    let competitors: any[] = []
    const serpKey = process.env.SERPAPI_KEY
    if (serpKey) {
      try {
        const serp = await fetchSerpResults(keyword, serpKey)
        competitors = (serp.organic_results || []).slice(0, 3).map(r => ({
          position: r.position,
          title: r.title,
          link: r.link,
          snippet: r.snippet,
        }))
      } catch (e) {
        console.warn('SERP fetch failed:', e)
      }
    }

    const analysis = await analyzePageOptimization(
      pageUrl,
      keyword,
      secondaryKeywords || [],
      competitors,
      site?.platform || null,
      site?.site_type || null,
    )

    const report = await prisma.page_optimization_reports.create({
      data: {
        site_id: siteId,
        user_id: user.id,
        page_url: pageUrl,
        keyword,
        secondary_keywords: secondaryKeywords || [],
        optimization_score: analysis.optimization_score,
        summary: analysis.summary,
        ideas: analysis.ideas as any,
        competitors: competitors as any,
      },
    })

    return NextResponse.json({ report, analysis, competitors })
  } catch (err: any) {
    console.error('Page optimizer error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const pageUrl = searchParams.get('pageUrl')
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

    const data = await prisma.page_optimization_reports.findMany({
      where: { site_id: siteId, user_id: user.id, ...(pageUrl ? { page_url: pageUrl } : {}) },
      orderBy: { created_at: 'desc' },
      take: 50,
    })

    return NextResponse.json({ reports: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
