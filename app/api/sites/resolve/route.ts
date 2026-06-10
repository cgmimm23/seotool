import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

// GET /api/sites/resolve?url=<url> — resolve one of the caller's sites by url
// (used by pages that take a ?url= param). Returns { site } or 404.
export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })
  const site = await prisma.sites.findFirst({
    where: { user_id: user.id, url },
    select: { id: true, name: true, url: true },
  })
  if (!site) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ site })
}
