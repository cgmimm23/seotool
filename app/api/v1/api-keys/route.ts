import { requireEnterprise } from '@/lib/enterprise'
import { generateApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const data = await prisma.api_keys.findMany({
    where: { user_id: auth.user!.id },
    select: {
      id: true,
      name: true,
      key_prefix: true,
      scopes: true,
      last_used_at: true,
      revoked: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json({ keys: data })
}

export async function POST(req: NextRequest) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { name, scopes } = await req.json()
  const { raw, hash, prefix } = generateApiKey()

  await prisma.api_keys.create({
    data: {
      user_id: auth.user!.id,
      name: name || 'Default',
      key_hash: hash,
      key_prefix: prefix,
      scopes: scopes || ['read'],
    },
  })

  return NextResponse.json({ key: raw, prefix, message: 'Save this key — it will not be shown again.' }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Scope revoke to the authenticated enterprise user.
  await prisma.api_keys.updateMany({
    where: { id, user_id: auth.user!.id },
    data: { revoked: true },
  })

  return NextResponse.json({ success: true })
}
