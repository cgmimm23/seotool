import { requireAdmin } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { passkey } = await req.json()
  const validPasskey = process.env.ADMIN_PASSKEY

  if (!validPasskey) {
    return NextResponse.json({ error: 'Passkey not configured on server' }, { status: 500 })
  }

  if (passkey !== validPasskey) {
    return NextResponse.json({ error: 'Invalid passkey' }, { status: 403 })
  }

  return NextResponse.json({ success: true })
}
