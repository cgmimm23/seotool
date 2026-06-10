import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { runSeoAudit } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { url, siteId, siteType: siteTypeOverride, platform: platformOverride } = await request.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    let resolvedSiteId = siteId
    let resolvedSiteType: string | null = siteTypeOverride || null
    let resolvedPlatform: string | null = platformOverride || null
    let resolvedAuditNotes: string | null = null

    if (!resolvedSiteId) {
      const cleanUrl = url.replace(/^https?:\/\//, '').split('/')[0]
      const baseUrl = url.startsWith('http') ? url.split('/').slice(0, 3).join('/') : 'https://' + cleanUrl

      const existing = await prisma.sites.findFirst({
        where: { user_id: user.id, url: { contains: cleanUrl, mode: 'insensitive' } },
        select: { id: true, site_type: true, platform: true, audit_notes: true },
      })

      if (existing) {
        resolvedSiteId = existing.id
        if (!resolvedSiteType) resolvedSiteType = existing.site_type
        if (!resolvedPlatform) resolvedPlatform = existing.platform
        resolvedAuditNotes = existing.audit_notes || null
      } else {
        const newSite = await prisma.sites.create({
          data: {
            user_id: user.id,
            url: baseUrl,
            name: cleanUrl,
            active: true,
            site_type: resolvedSiteType,
            platform: resolvedPlatform,
          },
        })
        if (newSite) resolvedSiteId = newSite.id
      }
    } else {
      // Scope: only resolve a site the caller owns
      const siteRow = await prisma.sites.findFirst({
        where: { id: resolvedSiteId, user_id: user.id },
        select: { site_type: true, platform: true, audit_notes: true },
      })
      if (!resolvedSiteType) resolvedSiteType = siteRow?.site_type || null
      if (!resolvedPlatform) resolvedPlatform = siteRow?.platform || null
      resolvedAuditNotes = siteRow?.audit_notes || null
    }

    // Persist any overrides the caller sent
    if (resolvedSiteId && (siteTypeOverride || platformOverride)) {
      const updates: any = {}
      if (siteTypeOverride) updates.site_type = siteTypeOverride
      if (platformOverride) updates.platform = platformOverride
      await prisma.sites.updateMany({ where: { id: resolvedSiteId, user_id: user.id }, data: updates })
    }

    const audit = await runSeoAudit(url, resolvedSiteType, resolvedPlatform, resolvedAuditNotes)

    // Save audit report
    const data = await prisma.audit_reports.create({
      data: {
        site_id: resolvedSiteId,
        user_id: user.id,
        url: audit.url || url,
        overall_score: audit.overall_score,
        grade: audit.grade,
        summary: audit.summary,
        categories: audit.categories,
        checks: audit.checks,
      },
    })

    // Update scan schedule
    if (resolvedSiteId) {
      await prisma.scan_schedule.upsert({
        where: { site_id: resolvedSiteId },
        create: {
          site_id: resolvedSiteId,
          user_id: user.id,
          last_scanned_at: new Date(),
        },
        update: {
          user_id: user.id,
          last_scanned_at: new Date(),
        },
      })
    }

    return NextResponse.json({ report: data, audit })
  } catch (err: any) {
    console.error('Audit error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    const data = await prisma.audit_reports.findMany({
      where: { user_id: user.id, ...(siteId ? { site_id: siteId } : {}) },
      orderBy: { created_at: 'desc' },
      take: 20,
    })

    return NextResponse.json({ reports: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
