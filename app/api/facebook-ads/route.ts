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
  const { user_access_token, ad_account_id } = ctx.tokens
  if (!user_access_token) return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  if (!ad_account_id) return NextResponse.json({ error: 'No ad account linked. Make sure the connected Facebook user manages at least one ad account and reconnect.' }, { status: 400 })

  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const until = new Date().toISOString().split('T')[0]
    const timeRange = JSON.stringify({ since, until })

    const [accountInfo, accountInsights, campaigns] = await Promise.all([
      graphFetch(`/${ad_account_id}`, user_access_token, {
        fields: 'id,name,account_status,currency,amount_spent,balance',
      }).catch(() => null),
      graphFetch(`/${ad_account_id}/insights`, user_access_token, {
        fields: 'spend,impressions,reach,clicks,ctr,cpc,cpm,frequency',
        time_range: timeRange,
      }).catch(() => ({ data: [] })),
      graphFetch(`/${ad_account_id}/campaigns`, user_access_token, {
        fields: 'id,name,status,objective,daily_budget,lifetime_budget,insights.time_range(' + timeRange + '){spend,impressions,reach,clicks,ctr,cpc}',
        limit: '20',
      }).catch(() => ({ data: [] })),
    ])

    const totals = accountInsights.data?.[0] || {}

    return NextResponse.json({
      account: accountInfo ? {
        id: accountInfo.id,
        name: accountInfo.name,
        status: accountInfo.account_status,
        currency: accountInfo.currency,
        lifetime_spend: accountInfo.amount_spent,
      } : null,
      totals: {
        spend: parseFloat(totals.spend || '0'),
        impressions: parseInt(totals.impressions || '0'),
        reach: parseInt(totals.reach || '0'),
        clicks: parseInt(totals.clicks || '0'),
        ctr: parseFloat(totals.ctr || '0'),
        cpc: parseFloat(totals.cpc || '0'),
        cpm: parseFloat(totals.cpm || '0'),
        frequency: parseFloat(totals.frequency || '0'),
      },
      campaigns: (campaigns.data || []).map((c: any) => {
        const ins = c.insights?.data?.[0] || {}
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
          daily_budget: c.daily_budget ? parseInt(c.daily_budget) / 100 : null,
          lifetime_budget: c.lifetime_budget ? parseInt(c.lifetime_budget) / 100 : null,
          spend: parseFloat(ins.spend || '0'),
          impressions: parseInt(ins.impressions || '0'),
          reach: parseInt(ins.reach || '0'),
          clicks: parseInt(ins.clicks || '0'),
          ctr: parseFloat(ins.ctr || '0'),
          cpc: parseFloat(ins.cpc || '0'),
        }
      }),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
