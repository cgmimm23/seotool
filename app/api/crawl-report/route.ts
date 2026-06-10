import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { url, pages, summary } = await request.json()
    if (!url || !pages) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

    const cleanUrl = url.replace(/^https?:\/\//, '').split('/')[0]
    const baseUrl = url.startsWith('http') ? url.split('/').slice(0, 3).join('/') : 'https://' + cleanUrl

    let siteId: string | null = null
    const existing = await prisma.sites.findFirst({
      where: { user_id: user.id, url: { contains: cleanUrl, mode: 'insensitive' } },
      select: { id: true },
    })
    if (existing) {
      siteId = existing.id
    } else {
      const newSite = await prisma.sites.create({
        data: { user_id: user.id, url: baseUrl, name: cleanUrl, active: true },
      })
      if (newSite) siteId = newSite.id
    }

    const totalIssues = pages.reduce((a: number, p: any) => a + (p.issues?.length || 0), 0)
    const errorPages = pages.filter((p: any) => p.status >= 400).length
    const cleanPages = pages.filter((p: any) => p.issues?.length === 0 && p.status < 400).length

    const data = await prisma.crawl_reports.create({
      data: {
        site_id: siteId, user_id: user.id, url: baseUrl,
        pages_crawled: pages.length, total_issues: totalIssues,
        error_pages: errorPages, clean_pages: cleanPages, pages, summary: summary || null,
      },
    })

    return NextResponse.json({ report: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const full = searchParams.get('full')

    const data = await prisma.crawl_reports.findMany({
      where: { user_id: user.id, ...(siteId ? { site_id: siteId } : {}) },
      orderBy: { created_at: 'desc' },
      take: 1,
      ...(full ? {} : {
        select: {
          id: true, url: true, pages_crawled: true, total_issues: true,
          error_pages: true, clean_pages: true, summary: true, created_at: true,
        },
      }),
    })

    return NextResponse.json({ reports: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
