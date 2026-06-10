import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { fetchSerpResults } from '@/lib/serpapi'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { keyword, keywordId, saveHistory } = await request.json()
    if (!keyword) return NextResponse.json({ error: 'Keyword required' }, { status: 400 })

    // Get user's SerpAPI key from profile
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { serp_api_key: true },
    })

    const apiKey = profile?.serp_api_key || process.env.SERPAPI_KEY
    if (!apiKey) return NextResponse.json({ error: 'SerpAPI key not configured' }, { status: 400 })

    // Fetch live SERP data
    const serpData = await fetchSerpResults(keyword, apiKey)

    // Save to history if keywordId provided
    if (keywordId && saveHistory) {
      // Scope: only persist rankings for a keyword the caller owns.
      const owned = await prisma.keywords.findFirst({
        where: { id: keywordId, user_id: user.id },
        select: { id: true },
      })
      if (owned) {
        const topResult = serpData.organic_results?.[0]
        await prisma.serp_rankings.create({
          data: {
            keyword_id: keywordId,
            user_id: user.id,
            position: topResult?.position || null,
            results: serpData.organic_results as any,
          },
        })
      }
    }

    return NextResponse.json({ results: serpData.organic_results })
  } catch (err: any) {
    console.error('SERP error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    // Get tracked keywords with latest rankings
    const keywords = await prisma.keywords.findMany({
      where: { user_id: user.id, site_id: siteId || '' },
      orderBy: { created_at: 'desc' },
      include: {
        serp_rankings: {
          select: { position: true, previous_position: true, checked_at: true },
        },
      },
    })

    return NextResponse.json({ keywords })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
