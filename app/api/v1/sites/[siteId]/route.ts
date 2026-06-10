import { authenticateApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const data = await prisma.sites.findFirst({
    where: { id: params.siteId, user_id: auth.userId },
  })

  if (!data) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  return NextResponse.json({ site: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = await authenticateApiKey(req)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!auth.scopes.includes('write') && !auth.scopes.includes('admin')) {
    return NextResponse.json({ error: 'Write scope required' }, { status: 403 })
  }

  // Scope delete to the key's user so a site can't be deleted cross-tenant.
  await prisma.sites.deleteMany({
    where: { id: params.siteId, user_id: auth.userId },
  })

  return NextResponse.json({ success: true })
}
