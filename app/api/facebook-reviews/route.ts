import { NextRequest, NextResponse } from 'next/server'
import { getSiteMeta, graphFetch } from '@/lib/meta'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

  const ctx = await getSiteMeta(siteId)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { page_id, page_access_token } = ctx.tokens
  if (!page_id || !page_access_token) return NextResponse.json({ error: 'No Facebook Page connected' }, { status: 400 })

  try {
    // Page-level rating summary
    const pageInfo = await graphFetch(`/${page_id}`, page_access_token, {
      fields: 'name,overall_star_rating,rating_count',
    }).catch(() => ({}))

    // Recommendations (reviews)
    const ratings = await graphFetch(`/${page_id}/ratings`, page_access_token, {
      fields: 'reviewer{name,picture},rating,recommendation_type,review_text,created_time,open_graph_story',
      limit: '50',
    }).catch((e: any) => ({ data: [], fetchError: e.message }))

    const items = (ratings.data || []).map((r: any) => ({
      reviewer: r.reviewer?.name || 'Anonymous',
      avatar: r.reviewer?.picture?.data?.url || null,
      rating: r.rating ?? null,
      recommendation_type: r.recommendation_type || null,
      text: r.review_text || null,
      created_time: r.created_time,
    }))

    return NextResponse.json({
      page_name: pageInfo.name || null,
      overall_rating: pageInfo.overall_star_rating ?? null,
      rating_count: pageInfo.rating_count ?? 0,
      reviews: items,
      fetch_error: ratings.fetchError || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
