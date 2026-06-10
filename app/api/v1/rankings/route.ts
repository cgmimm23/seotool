import { authenticateApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const keywordId = searchParams.get('keyword_id')
  const limit = parseInt(searchParams.get('limit') || '50')

  const data = await prisma.serp_rankings.findMany({
    where: {
      user_id: auth.userId,
      ...(keywordId ? { keyword_id: keywordId } : {}),
    },
    select: {
      id: true,
      keyword_id: true,
      position: true,
      previous_position: true,
      checked_at: true,
    },
    orderBy: { checked_at: 'desc' },
    take: limit,
  })

  return NextResponse.json({ rankings: data })
}
