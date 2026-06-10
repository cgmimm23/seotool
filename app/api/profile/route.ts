import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

// GET /api/profile — the caller's profile + derived connection status. Replaces
// the client-side `supabase.from('profiles')` reads and the old
// `session.provider_token` Google-connection check.
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const p = await prisma.profiles.findUnique({ where: { id: user.id } })
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({
    profile: p,
    googleConnected: !!p.google_access_token,
  })
}

// PATCH /api/profile — update self-serve profile fields.
const ALLOWED = new Set(['onboarding_completed', 'ga4_property_id', 'weekly_report_enabled', 'full_name'])
export async function PATCH(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  for (const key of Object.keys(body)) {
    if (ALLOWED.has(key)) data[key] = body[key]
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No updatable fields' }, { status: 400 })
  }
  const profile = await prisma.profiles.update({ where: { id: user.id }, data })
  return NextResponse.json({ profile })
}
