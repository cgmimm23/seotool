import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: customer's notifications
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get personal + broadcast (user_id IS NULL) notifications
  const data = await prisma.notifications.findMany({
    where: { OR: [{ user_id: user.id }, { user_id: null }] },
    select: { id: true, title: true, message: true, type: true, read: true, created_at: true },
    orderBy: { created_at: 'desc' },
    take: 20,
  })

  const unread = data.filter(n => !n.read).length

  return NextResponse.json({ notifications: data, unread })
}

// PATCH: mark notifications as read
export async function PATCH(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()

  if (ids && ids.length > 0) {
    // Scope: only the caller's own notifications.
    await prisma.notifications.updateMany({
      where: { id: { in: ids }, user_id: user.id },
      data: { read: true },
    })
  } else {
    // Mark all as read
    await prisma.notifications.updateMany({
      where: { user_id: user.id, read: false },
      data: { read: true },
    })
  }

  return NextResponse.json({ success: true })
}
