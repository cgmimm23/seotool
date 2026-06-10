import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  // Admin route — intentionally cross-user (admin-gated by requireAdmin).
  const [profile, sites, totalAudits, totalKeywords] = await Promise.all([
    prisma.profiles.findUnique({ where: { id: params.id } }),
    prisma.sites.findMany({
      where: { user_id: params.id },
      select: { id: true, url: true, name: true, active: true, created_at: true },
    }),
    prisma.audit_reports.count({ where: { user_id: params.id } }),
    prisma.keywords.count({ where: { user_id: params.id } }),
  ])

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const dupes = profile.email
    ? await prisma.profiles.findMany({
        where: { email: profile.email, id: { not: params.id } },
        select: { id: true, plan: true, created_at: true },
      })
    : []

  return NextResponse.json({
    user: profile,
    sites: sites || [],
    totalAudits: totalAudits || 0,
    totalKeywords: totalKeywords || 0,
    duplicates: dupes || [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const body = await req.json()
  const updates: Record<string, any> = {}
  const allowed = ['plan', 'status', 'full_name', 'role', 'trial_ends_at']

  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Setting a paid plan clears trial, reactivates, and skips onboarding gate.
  const paidPlans = ['starter', 'pro', 'agency', 'enterprise']
  if (updates.plan && paidPlans.includes(updates.plan)) {
    if (body.trial_ends_at === undefined) updates.trial_ends_at = null
    if (body.status === undefined) updates.status = 'active'
    updates.onboarding_completed = true
  }

  // trial_ends_at arrives as a string/null; coerce to Date for Prisma.
  if (updates.trial_ends_at) updates.trial_ends_at = new Date(updates.trial_ends_at)

  updates.updated_at = new Date()

  // Admin route — intentionally cross-user (admin-gated by requireAdmin).
  await prisma.profiles.update({
    where: { id: params.id },
    data: updates,
  })

  // If suspending, ban the auth user too (banned_until in auth.users);
  // reactivating clears the ban.
  if (updates.status === 'suspended') {
    await prisma.users.update({
      where: { id: params.id },
      data: { banned_until: new Date('9999-12-31T00:00:00Z') },
    }).catch(() => {})
  } else if (updates.status === 'active') {
    await prisma.users.update({
      where: { id: params.id },
      data: { banned_until: null },
    }).catch(() => {})
  }

  // Log activity (non-fatal; admin_id references profiles in the schema, so
  // swallow FK errors to preserve the prior fire-and-forget behavior).
  await prisma.admin_activity_log.create({
    data: {
      admin_id: auth.user!.id,
      action: 'update_user',
      target_user_id: params.id,
      details: updates,
    },
  }).catch(() => {})

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  // Prevent self-deletion
  if (params.id === auth.user!.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  // Get user info for logging
  const profile = await prisma.profiles.findUnique({
    where: { id: params.id },
    select: { email: true },
  })

  // Delete the auth.users row; profiles (and downstream data) cascade via FK.
  try {
    await prisma.users.delete({ where: { id: params.id } })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete user' }, { status: 500 })
  }

  // Log activity (non-fatal; see note in PATCH).
  await prisma.admin_activity_log.create({
    data: {
      admin_id: auth.user!.id,
      action: 'delete_user',
      target_user_id: params.id,
      details: { email: profile?.email },
    },
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
