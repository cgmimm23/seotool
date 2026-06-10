import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/disavow/bing — push unsynced disavows to Bing Webmaster
// body: { siteId, bingSiteUrl }
export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { siteId, bingSiteUrl } = await req.json()
  if (!siteId || !bingSiteUrl) return NextResponse.json({ error: 'siteId and bingSiteUrl required' }, { status: 400 })

  const site = await prisma.sites.findUnique({ where: { id: siteId }, select: { user_id: true, bing_api_key: true } })
  if (!site || site.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!site.bing_api_key) return NextResponse.json({ error: 'No Bing API key for this site' }, { status: 400 })

  const rows = await prisma.disavowed_backlinks.findMany({
    where: { site_id: siteId, user_id: user.id, synced_to_bing: false },
  })

  const cleanSiteUrl = bingSiteUrl.replace(/\/$/, '')
  const results: any[] = []
  for (const r of rows) {
    try {
      const res = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/AddToLinkDisavow?apikey=${site.bing_api_key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          siteUrl: cleanSiteUrl,
          disavowedLink: { DisavowedLinkType: r.scope === 'domain' ? 1 : 0, Value: r.target },
        }),
      })
      if (res.ok) {
        await prisma.disavowed_backlinks.update({ where: { id: r.id }, data: { synced_to_bing: true } })
        results.push({ id: r.id, target: r.target, success: true })
      } else {
        const err = await res.text()
        results.push({ id: r.id, target: r.target, success: false, error: err })
      }
    } catch (e: any) {
      results.push({ id: r.id, target: r.target, success: false, error: e.message })
    }
  }

  return NextResponse.json({ synced: results.filter(r => r.success).length, total: results.length, results })
}
