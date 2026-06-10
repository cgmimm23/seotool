import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '20')

  // Admin route — intentionally cross-user (admin-gated by requireAdmin).
  const data = await prisma.admin_activity_log.findMany({
    orderBy: { created_at: 'desc' },
    take: limit,
  })

  return NextResponse.json({ activities: data || [] })
}
