import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Platform settings stored in a simple key-value table
// For now, use a JSON file approach via a single row

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const data = await prisma.platform_settings.findMany({
    select: { key: true, value: true },
  })

  const settings: Record<string, string> = {}
  ;(data || []).forEach((row) => { settings[row.key] = row.value })

  return NextResponse.json({ settings })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { key, value } = await req.json()
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  await prisma.platform_settings.upsert({
    where: { key },
    create: { key, value: value || '' },
    update: { value: value || '' },
  })

  return NextResponse.json({ success: true })
}
