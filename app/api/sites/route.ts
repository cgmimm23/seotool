import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

// GET /api/sites — the current user's sites.
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sites = await prisma.sites.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: 'desc' },
  })
  return NextResponse.json({ sites })
}

// POST /api/sites — create a site (+ its scan_schedule row) for the user.
export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const url = String(body.url || '').trim()
  const name = body.name ? String(body.name).trim() : null
  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  const site = await prisma.sites.create({
    data: { user_id: user.id, url, name, active: true },
  })
  // Mirror the old client behavior: seed a scan_schedule row.
  await prisma.scan_schedule
    .create({ data: { site_id: site.id, user_id: user.id } })
    .catch((e) => console.error('[sites] scan_schedule seed failed:', e))

  return NextResponse.json({ site }, { status: 201 })
}

// DELETE /api/sites?id=<siteId> — owner-scoped delete.
export async function DELETE(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  const result = await prisma.sites.deleteMany({ where: { id, user_id: user.id } })
  if (result.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
