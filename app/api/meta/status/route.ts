import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/meta/status?siteId= — Meta connection status for an owned site.
export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

  const site = await prisma.sites.findFirst({
    where: { id: siteId, user_id: user.id },
    select: {
      meta_user_access_token: true,
      meta_page_id: true,
      meta_page_name: true,
      meta_ig_user_id: true,
      meta_ig_username: true,
      meta_ad_account_id: true,
    },
  })

  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    connected: !!site.meta_user_access_token,
    pageId: site.meta_page_id,
    pageName: site.meta_page_name,
    igUserId: site.meta_ig_user_id,
    igUsername: site.meta_ig_username,
    adAccountId: site.meta_ad_account_id,
  })
}
