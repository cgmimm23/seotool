import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/auth'

const PLAN_LIMITS: Record<string, { sites: number; label: string }> = {
  free:       { sites: 1,    label: 'Free' },
  starter:    { sites: 1,    label: 'Starter' },
  pro:        { sites: 5,    label: 'Pro' },
  agency:     { sites: 999,  label: 'Agency' },
  enterprise: { sites: 9999, label: 'Enterprise' },
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profiles.findUnique({ where: { id: user.id }, select: { plan: true } })
    const plan = profile?.plan || 'free'
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

    const count = await prisma.sites.count({ where: { user_id: user.id } })

    return NextResponse.json({
      plan,
      label: limits.label,
      siteLimit: limits.sites,
      sitesUsed: count || 0,
      canAddSite: (count || 0) < limits.sites,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
