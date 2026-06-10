import { NextRequest, NextResponse } from 'next/server'
import { getSiteMeta, graphFetch } from '@/lib/meta'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// List all pages the user manages — for the page picker
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

  const ctx = await getSiteMeta(siteId)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.tokens.user_access_token) return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })

  try {
    const pages = await graphFetch('/me/accounts', ctx.tokens.user_access_token, {
      fields: 'id,name,access_token,category,instagram_business_account{id,username,profile_picture_url}',
    })
    return NextResponse.json({ pages: pages.data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Switch selected page
export async function POST(req: NextRequest) {
  const { siteId, pageId } = await req.json()
  if (!siteId || !pageId) return NextResponse.json({ error: 'siteId and pageId required' }, { status: 400 })

  const ctx = await getSiteMeta(siteId)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ctx.tokens.user_access_token) return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })

  try {
    const pages = await graphFetch('/me/accounts', ctx.tokens.user_access_token, {
      fields: 'id,name,access_token,instagram_business_account{id,username}',
    })
    const chosen = (pages.data || []).find((p: any) => p.id === pageId)
    if (!chosen) return NextResponse.json({ error: 'Page not found or not accessible' }, { status: 404 })

    // getSiteMeta already verified ownership; scope the write by owner too.
    await prisma.sites.updateMany({
      where: { id: siteId, user_id: ctx.site.user_id },
      data: {
        meta_page_id: chosen.id,
        meta_page_name: chosen.name,
        meta_page_access_token: chosen.access_token,
        meta_ig_user_id: chosen.instagram_business_account?.id || null,
        meta_ig_username: chosen.instagram_business_account?.username || null,
      },
    })

    return NextResponse.json({ success: true, page: chosen })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
