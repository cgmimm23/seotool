import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { NextResponse } from 'next/server'

export function isEnterprise(plan: string): boolean {
  return plan === 'enterprise'
}

export async function requireEnterprise() {
  const user = await getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), user: null, profile: null }
  }

  const profile = await prisma.profiles.findUnique({ where: { id: user.id } })

  if (!profile || profile.plan !== 'enterprise') {
    return { error: NextResponse.json({ error: 'Enterprise plan required' }, { status: 403 }), user: null, profile: null }
  }

  return { error: null, user, profile }
}
