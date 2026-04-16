import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getGoogleToken } from '@/lib/google-token'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accessToken = await getGoogleToken()
    if (!accessToken) return NextResponse.json({ error: 'No Google access token. Please reconnect your Google account.' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const days = parseInt(searchParams.get('days') || '30')
    if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })

    const cleanId = customerId.replace(/-/g, '')
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
    }

    const baseUrl = `https://googleads.googleapis.com/v14/customers/${cleanId}/googleAds:searchStream`

    const [campaignsRes, keywordsRes, searchTermsRes, dailyRes] = await Promise.all([
      fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({ query: `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc, campaign_budget.amount_micros FROM campaign WHERE segments.date BETWEEN '${fmt(startDate)}' AND '${fmt(endDate)}' AND campaign.status != 'REMOVED' ORDER BY metrics.cost_micros DESC LIMIT 20` }) }),
      fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({ query: `SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.quality_info.quality_score, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.average_cpc FROM ad_group_criterion WHERE ad_group_criterion.type = 'KEYWORD' AND segments.date BETWEEN '${fmt(startDate)}' AND '${fmt(endDate)}' AND ad_group_criterion.status != 'REMOVED' ORDER BY metrics.cost_micros DESC LIMIT 25` }) }),
      fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({ query: `SELECT search_term_view.search_term, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.ctr FROM search_term_view WHERE segments.date BETWEEN '${fmt(startDate)}' AND '${fmt(endDate)}' ORDER BY metrics.clicks DESC LIMIT 25` }) }),
      fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({ query: `SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM customer WHERE segments.date BETWEEN '${fmt(startDate)}' AND '${fmt(endDate)}' ORDER BY segments.date ASC` }) }),
    ])

    if (!campaignsRes.ok) {
      const err = await campaignsRes.json()
      throw new Error(err[0]?.error?.message || 'Google Ads API error')
    }

    const parseBatch = async (res: Response) => {
      const text = await res.text()
      try {
        const lines = text.trim().split('\n').filter(Boolean)
        const results: any[] = []
        for (const line of lines) {
          const parsed = JSON.parse(line)
          if (parsed.results) results.push(...parsed.results)
        }
        return results
      } catch { return [] }
    }

    const [campaigns, keywords, searchTerms, daily] = await Promise.all([
      parseBatch(campaignsRes),
      parseBatch(keywordsRes),
      parseBatch(searchTermsRes),
      parseBatch(dailyRes),
    ])

    const microsToDollars = (m: number) => (m / 1_000_000).toFixed(2)

    const totals = daily.reduce((acc: any, d: any) => ({
      impressions: acc.impressions + (d.metrics?.impressions || 0),
      clicks: acc.clicks + (d.metrics?.clicks || 0),
      cost: acc.cost + (d.metrics?.costMicros || 0),
      conversions: acc.conversions + (d.metrics?.conversions || 0),
    }), { impressions: 0, clicks: 0, cost: 0, conversions: 0 })

    return NextResponse.json({
      totals: {
        impressions: Math.round(totals.impressions),
        clicks: Math.round(totals.clicks),
        cost: '$' + microsToDollars(totals.cost),
        conversions: Math.round(totals.conversions),
        ctr: totals.impressions ? (totals.clicks / totals.impressions * 100).toFixed(2) + '%' : '0%',
        avgCpc: totals.clicks ? '$' + microsToDollars(totals.cost / totals.clicks) : '$0',
        roas: totals.cost > 0 && totals.conversions > 0 ? (totals.conversions / (totals.cost / 1_000_000)).toFixed(2) : '0',
      },
      daily: daily.map((d: any) => ({
        date: d.segments?.date,
        impressions: d.metrics?.impressions || 0,
        clicks: d.metrics?.clicks || 0,
        cost: parseFloat(microsToDollars(d.metrics?.costMicros || 0)),
        conversions: d.metrics?.conversions || 0,
      })),
      campaigns: campaigns.map((c: any) => ({
        id: c.campaign?.id,
        name: c.campaign?.name,
        status: c.campaign?.status,
        type: c.campaign?.advertisingChannelType,
        impressions: c.metrics?.impressions || 0,
        clicks: c.metrics?.clicks || 0,
        cost: '$' + microsToDollars(c.metrics?.costMicros || 0),
        conversions: c.metrics?.conversions || 0,
        ctr: ((c.metrics?.ctr || 0) * 100).toFixed(2) + '%',
        avgCpc: '$' + microsToDollars(c.metrics?.averageCpc || 0),
        budget: '$' + microsToDollars(c.campaignBudget?.amountMicros || 0),
      })),
      keywords: keywords.map((k: any) => ({
        text: k.adGroupCriterion?.keyword?.text,
        matchType: k.adGroupCriterion?.keyword?.matchType,
        qualityScore: k.adGroupCriterion?.qualityInfo?.qualityScore || 'N/A',
        impressions: k.metrics?.impressions || 0,
        clicks: k.metrics?.clicks || 0,
        cost: '$' + microsToDollars(k.metrics?.costMicros || 0),
        conversions: k.metrics?.conversions || 0,
        avgCpc: '$' + microsToDollars(k.metrics?.averageCpc || 0),
      })),
      searchTerms: searchTerms.map((s: any) => ({
        term: s.searchTermView?.searchTerm,
        impressions: s.metrics?.impressions || 0,
        clicks: s.metrics?.clicks || 0,
        cost: '$' + microsToDollars(s.metrics?.costMicros || 0),
        conversions: s.metrics?.conversions || 0,
        ctr: ((s.metrics?.ctr || 0) * 100).toFixed(2) + '%',
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
