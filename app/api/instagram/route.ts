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
  const { ig_user_id, page_access_token } = ctx.tokens
  if (!ig_user_id || !page_access_token) {
    return NextResponse.json({
      error: 'No Instagram Business account linked to the connected Facebook Page. In the Facebook Page settings, link an Instagram Business or Creator account, then reconnect.',
    }, { status: 400 })
  }

  try {
    const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
    const until = Math.floor(Date.now() / 1000)

    const [profile, insights, media] = await Promise.all([
      graphFetch(`/${ig_user_id}`, page_access_token, {
        fields: 'id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website',
      }),
      graphFetch(`/${ig_user_id}/insights`, page_access_token, {
        metric: 'reach,impressions,profile_views,website_clicks',
        period: 'day',
        since: String(since),
        until: String(until),
      }).catch(() => ({ data: [] })),
      graphFetch(`/${ig_user_id}/media`, page_access_token, {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,insights.metric(impressions,reach,engagement)',
        limit: '12',
      }).catch(() => ({ data: [] })),
    ])

    const sumInsight = (name: string) => {
      const entry = (insights.data || []).find((i: any) => i.name === name)
      if (!entry) return 0
      return (entry.values || []).reduce((a: number, v: any) => a + (typeof v.value === 'number' ? v.value : 0), 0)
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        name: profile.name,
        biography: profile.biography,
        picture: profile.profile_picture_url,
        followers: profile.followers_count || 0,
        follows: profile.follows_count || 0,
        media_count: profile.media_count || 0,
        website: profile.website,
      },
      totals: {
        reach: sumInsight('reach'),
        impressions: sumInsight('impressions'),
        profile_views: sumInsight('profile_views'),
        website_clicks: sumInsight('website_clicks'),
      },
      media: (media.data || []).map((m: any) => {
        const ins = m.insights?.data || []
        const getIns = (name: string) => {
          const e = ins.find((x: any) => x.name === name)
          return e?.values?.[0]?.value || 0
        }
        return {
          id: m.id,
          caption: (m.caption || '').slice(0, 280),
          media_type: m.media_type,
          media_url: m.media_url,
          thumbnail_url: m.thumbnail_url,
          permalink: m.permalink,
          timestamp: m.timestamp,
          likes: m.like_count || 0,
          comments: m.comments_count || 0,
          impressions: getIns('impressions'),
          reach: getIns('reach'),
          engagement: getIns('engagement'),
        }
      }),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
