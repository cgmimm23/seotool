import { authenticateApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // Verify site ownership
  const site = await prisma.sites.findFirst({
    where: { id: params.siteId, user_id: auth.userId },
    select: { id: true },
  })

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '10')

  const data = await prisma.audit_reports.findMany({
    where: { site_id: params.siteId, user_id: auth.userId },
    select: {
      id: true,
      url: true,
      overall_score: true,
      grade: true,
      summary: true,
      categories: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
    take: limit,
  })

  return NextResponse.json({ audits: data })
}
