import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = cookies()
  const adminSession = cookieStore.get('admin_session')?.value

  if (!adminSession) {
    return NextResponse.json({ role: null }, { status: 401 })
  }

  const admin = await prisma.admin_accounts.findUnique({
    where: { id: adminSession },
    select: { email: true, name: true },
  })

  if (!admin) {
    return NextResponse.json({ role: null }, { status: 401 })
  }

  return NextResponse.json({ role: 'admin', email: admin.email, name: admin.name })
}
