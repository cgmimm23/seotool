import { authenticateApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('site_id')

  const data = await prisma.keywords.findMany({
    where: {
      user_id: auth.userId,
      ...(siteId ? { site_id: siteId } : {}),
    },
    select: {
      id: true,
      site_id: true,
      page_path: true,
      keyword: true,
      target_position: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
    take: 100,
  })

  return NextResponse.json({ keywords: data })
}
