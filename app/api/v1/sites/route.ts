import { authenticateApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const [data, count] = await Promise.all([
    prisma.sites.findMany({
      where: { user_id: auth.userId },
      select: { id: true, url: true, name: true, active: true, created_at: true },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.sites.count({ where: { user_id: auth.userId } }),
  ])

  return NextResponse.json({ sites: data, total: count, limit, offset })
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.scopes.includes('write') && !auth.scopes.includes('admin')) {
    return NextResponse.json({ error: 'Write scope required' }, { status: 403 })
  }

  const { url, name } = await req.json()
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  const data = await prisma.sites.create({
    data: { user_id: auth.userId, url, name: name || url },
  })

  return NextResponse.json({ site: data }, { status: 201 })
}
