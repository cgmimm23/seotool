import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getGoogleToken } from '@/lib/google-token'

export const dynamic = 'force-dynamic'

// GET /api/gbp/data?siteId=...&locationName=accounts/X/locations/Y&days=28
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const siteId = searchParams.get('siteId')
    const locationName = searchParams.get('locationName')
    const days = parseInt(searchParams.get('days') || '28')

    const accessToken = await getGoogleToken(siteId)
    if (!accessToken) return NextResponse.json({ error: 'No Google access token. Reconnect Google for this site.' }, { status: 401 })

    const headers = { Authorization: `Bearer ${accessToken}` }

    // If no location specified, return the list of accounts+locations
    if (!locationName) {
      const acctRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers })
      const acctData = await acctRes.json()
      if (!acctRes.ok) return NextResponse.json({ error: acctData.error?.message || 'Failed to fetch accounts' }, { status: acctRes.status })
      const accounts = acctData.accounts || []

      const locationsByAccount: any[] = []
      for (const acct of accounts) {
        const locRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${acct.name}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,categories,profile,regularHours`, { headers })
        const locData = await locRes.json()
        locationsByAccount.push({
          account: acct,
          locations: locData.locations || [],
          locError: !locRes.ok ? (locData.error?.message || `status ${locRes.status}`) : null,
        })
      }
      return NextResponse.json({ accounts: locationsByAccount })
    }

    // Fetch profile
    const profRes = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri,categories,profile,regularHours,metadata`, { headers })
    const profile = await profRes.json()

    // Insights — daily metrics
    const now = new Date()
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const metrics = [
      'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
      'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
      'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
      'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
      'CALL_CLICKS',
      'WEBSITE_CLICKS',
      'BUSINESS_DIRECTION_REQUESTS',
      'BUSINESS_CONVERSATIONS',
      'BUSINESS_BOOKINGS',
    ]
    const q = new URLSearchParams()
    metrics.forEach(m => q.append('dailyMetrics', m))
    q.set('dailyRange.start_date.year', String(start.getUTCFullYear()))
    q.set('dailyRange.start_date.month', String(start.getUTCMonth() + 1))
    q.set('dailyRange.start_date.day', String(start.getUTCDate()))
    q.set('dailyRange.end_date.year', String(now.getUTCFullYear()))
    q.set('dailyRange.end_date.month', String(now.getUTCMonth() + 1))
    q.set('dailyRange.end_date.day', String(now.getUTCDate()))

    const insightsRes = await fetch(`https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries?${q}`, { headers })
    const insightsData = await insightsRes.json()
    const totals: Record<string, number> = {}
    for (const series of insightsData.multiDailyMetricTimeSeries || []) {
      for (const dm of series.dailyMetricTimeSeries || []) {
        const name = dm.dailyMetric
        const sum = (dm.timeSeries?.datedValues || []).reduce((a: number, v: any) => a + parseInt(v.value || '0'), 0)
        totals[name] = (totals[name] || 0) + sum
      }
    }

    // Posts
    const postsRes = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/localPosts`, { headers })
    const postsData = await postsRes.json()

    // Reviews (count + recent)
    const reviewsRes = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=20`, { headers })
    const reviewsData = await reviewsRes.json()

    return NextResponse.json({
      profile: profRes.ok ? profile : { error: profile.error?.message },
      totals: {
        impressions_desktop_maps: totals.BUSINESS_IMPRESSIONS_DESKTOP_MAPS || 0,
        impressions_desktop_search: totals.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH || 0,
        impressions_mobile_maps: totals.BUSINESS_IMPRESSIONS_MOBILE_MAPS || 0,
        impressions_mobile_search: totals.BUSINESS_IMPRESSIONS_MOBILE_SEARCH || 0,
        total_impressions:
          (totals.BUSINESS_IMPRESSIONS_DESKTOP_MAPS || 0) +
          (totals.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH || 0) +
          (totals.BUSINESS_IMPRESSIONS_MOBILE_MAPS || 0) +
          (totals.BUSINESS_IMPRESSIONS_MOBILE_SEARCH || 0),
        calls: totals.CALL_CLICKS || 0,
        website_clicks: totals.WEBSITE_CLICKS || 0,
        direction_requests: totals.BUSINESS_DIRECTION_REQUESTS || 0,
        messages: totals.BUSINESS_CONVERSATIONS || 0,
        bookings: totals.BUSINESS_BOOKINGS || 0,
      },
      posts: (postsData.localPosts || []).slice(0, 10),
      review_count: (reviewsData.reviews || []).length,
      average_rating: reviewsData.averageRating || null,
      total_review_count: reviewsData.totalReviewCount || 0,
      insights_error: !insightsRes.ok ? (insightsData.error?.message || null) : null,
      posts_error: !postsRes.ok ? (postsData.error?.message || null) : null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
