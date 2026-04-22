import { NextRequest, NextResponse } from 'next/server'
import { getSiteMeta, graphFetch } from '@/lib/meta'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  const days = parseInt(searchParams.get('days') || '28')
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

  const ctx = await getSiteMeta(siteId)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { page_id, page_access_token } = ctx.tokens
  if (!page_id || !page_access_token) return NextResponse.json({ error: 'No Facebook Page connected' }, { status: 400 })

  try {
    const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
    const until = Math.floor(Date.now() / 1000)

    const [pageInfo, insights, posts] = await Promise.all([
      graphFetch(`/${page_id}`, page_access_token, {
        fields: 'id,name,about,category,link,picture{url},fan_count,followers_count,verification_status',
      }),
      graphFetch(`/${page_id}/insights`, page_access_token, {
        metric: 'page_impressions,page_impressions_unique,page_post_engagements,page_fan_adds,page_fan_removes,page_views_total',
        period: 'day',
        since: String(since),
        until: String(until),
      }).catch(() => ({ data: [] })),
      graphFetch(`/${page_id}/posts`, page_access_token, {
        fields: 'id,message,created_time,permalink_url,full_picture,insights.metric(post_impressions,post_impressions_unique,post_engaged_users,post_reactions_by_type_total){values}',
        limit: '10',
      }).catch(() => ({ data: [] })),
    ])

    const sumInsight = (name: string) => {
      const entry = (insights.data || []).find((i: any) => i.name === name)
      if (!entry) return 0
      return (entry.values || []).reduce((a: number, v: any) => a + (typeof v.value === 'number' ? v.value : 0), 0)
    }

    return NextResponse.json({
      page: {
        id: pageInfo.id,
        name: pageInfo.name,
        about: pageInfo.about,
        category: pageInfo.category,
        link: pageInfo.link,
        picture: pageInfo.picture?.data?.url,
        fan_count: pageInfo.fan_count,
        followers_count: pageInfo.followers_count,
        verified: pageInfo.verification_status === 'blue_verified' || pageInfo.verification_status === 'gray_verified',
      },
      totals: {
        impressions: sumInsight('page_impressions'),
        reach: sumInsight('page_impressions_unique'),
        engagements: sumInsight('page_post_engagements'),
        new_fans: sumInsight('page_fan_adds'),
        lost_fans: sumInsight('page_fan_removes'),
        page_views: sumInsight('page_views_total'),
      },
      posts: (posts.data || []).map((p: any) => {
        const ins = p.insights?.data || []
        const getIns = (name: string) => {
          const e = ins.find((x: any) => x.name === name)
          return e?.values?.[0]?.value || 0
        }
        return {
          id: p.id,
          message: p.message?.slice(0, 280) || '',
          created_time: p.created_time,
          permalink_url: p.permalink_url,
          picture: p.full_picture,
          impressions: getIns('post_impressions'),
          reach: getIns('post_impressions_unique'),
          engagements: getIns('post_engaged_users'),
        }
      }),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
