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
    const propertyId = searchParams.get('propertyId')
    const days = parseInt(searchParams.get('days') || '30')
    if (!propertyId) return NextResponse.json({ error: 'propertyId required' }, { status: 400 })

    const endDate = 'today'
    const startDate = `${days}daysAgo`
    const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    const baseUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`

    const [overviewRes, pagesRes, sourcesRes, devicesRes] = await Promise.all([
      fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      })}),
      fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'bounceRate' }],
        limit: 10,
      })}),
      fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        limit: 8,
      })}),
      fetch(baseUrl, { method: 'POST', headers, body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      })}),
    ])

    if (!overviewRes.ok) {
      const err = await overviewRes.json()
      throw new Error(err.error?.message || 'GA4 API error')
    }

    const [overview, pages, sources, devices] = await Promise.all([
      overviewRes.json(), pagesRes.json(), sourcesRes.json(), devicesRes.json(),
    ])

    const daily = (overview.rows || []).map((r: any) => ({
      date: r.dimensionValues[0].value,
      sessions: parseInt(r.metricValues[0].value),
      users: parseInt(r.metricValues[1].value),
      bounceRate: parseFloat(r.metricValues[2].value),
      avgDuration: parseFloat(r.metricValues[3].value),
    }))

    const totals = daily.reduce((acc: any, d: any) => ({
      sessions: acc.sessions + d.sessions,
      users: acc.users + d.users,
    }), { sessions: 0, users: 0 })

    return NextResponse.json({
      totals: {
        sessions: totals.sessions,
        users: totals.users,
        avgBounceRate: daily.length ? (daily.reduce((a: number, d: any) => a + d.bounceRate, 0) / daily.length * 100).toFixed(1) : '0',
        avgDuration: daily.length ? formatDuration(daily.reduce((a: number, d: any) => a + d.avgDuration, 0) / daily.length) : '0:00',
      },
      daily,
      pages: (pages.rows || []).map((r: any) => ({
        page: r.dimensionValues[0].value,
        sessions: parseInt(r.metricValues[0].value),
        users: parseInt(r.metricValues[1].value),
        bounceRate: (parseFloat(r.metricValues[2].value) * 100).toFixed(1),
      })),
      sources: (sources.rows || []).map((r: any) => ({
        channel: r.dimensionValues[0].value,
        sessions: parseInt(r.metricValues[0].value),
        users: parseInt(r.metricValues[1].value),
      })),
      devices: (devices.rows || []).map((r: any) => ({
        device: r.dimensionValues[0].value,
        sessions: parseInt(r.metricValues[0].value),
        users: parseInt(r.metricValues[1].value),
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
