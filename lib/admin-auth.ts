import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function requireAdmin() {
  const cookieStore = cookies()
  const adminSession = cookieStore.get('admin_session')?.value

  if (!adminSession) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null }
  }

  // Look up in admin_accounts — completely separate from customer profiles
  const admin = await prisma.admin_accounts.findUnique({
    where: { id: adminSession },
    select: { id: true, email: true, name: true },
  })

  if (!admin) {
    return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }), user: null }
  }

  return { error: null, user: { id: admin.id, email: admin.email } }
}
