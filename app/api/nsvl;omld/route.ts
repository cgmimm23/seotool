import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MOZ_API_URL = 'https://lsapi.seomoz.com/v2'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const siteUrl = searchParams.get('siteUrl')
  const limit = parseInt(searchParams.get('limit') || '50')

  if (!siteUrl) {
    return NextResponse.json({ error: 'siteUrl param required' }, { status: 400 })
  }

  const token = process.env.MOZ_API_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'MOZ_API_TOKEN not configured' }, { status: 500 })
  }

  try {
    // Clean the URL
    const cleanUrl = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')

    // Get domain authority + link metrics
    const metricsRes = await fetch(`${MOZ_API_URL}/url_metrics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targets: [cleanUrl],
        metrics: [
          'domain_authority',
          'page_authority',
          'linking_root_domains',
          'links_to_target',
          'spam_score',
        ],
      }),
    })

    if (!metricsRes.ok) {
      const err = await metricsRes.text()
      throw new Error(`Moz metrics error: ${metricsRes.status} ${err}`)
    }

    const metricsData = await metricsRes.json()
    const metrics = metricsData.results?.[0] || {}

    // Get referring domains (backlink list)
    const backlinksRes = await fetch(`${MOZ_API_URL}/links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: cleanUrl,
        target_scope: 'root_domain',
        filter: 'external',
        link_limit: limit,
        link_offset: 0,
        sort: 'domain_authority_desc',
        metrics: [
          'domain_authority',
          'page_authority',
          'spam_score',
          'nofollow',
          'anchor',
          'source_url',
          'last_crawled',
        ],
      }),
    })

    let backlinks: any[] = []

    if (backlinksRes.ok) {
      const backlinksData = await backlinksRes.json()
      backlinks = (backlinksData.results || []).map((link: any) => ({
        domain: link.source_url ? new URL('https://' + link.source_url.replace(/^https?:\/\//, '')).hostname : link.source_url,
        sourceUrl: link.source_url,
        da: Math.round(link.domain_authority || 0),
        pa: Math.round(link.page_authority || 0),
        spamScore: Math.round((link.spam_score || 0) * 100),
        type: link.nofollow ? 'nofollow' : 'dofollow',
        anchor: link.anchor || '',
        lastCrawled: link.last_crawled ? new Date(link.last_crawled * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown',
      }))
    }

    return NextResponse.json({
      metrics: {
        da: Math.round(metrics.domain_authority || 0),
        pa: Math.round(metrics.page_authority || 0),
        linkingDomains: metrics.linking_root_domains || 0,
        totalLinks: metrics.links_to_target || 0,
        spamScore: Math.round((metrics.spam_score || 0) * 100),
      },
      backlinks,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
