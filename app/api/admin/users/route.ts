import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '25')
  const search = searchParams.get('search') || ''
  const planFilter = searchParams.get('plan') || ''
  const statusFilter = searchParams.get('status') || ''
  const offset = (page - 1) * limit

  // Admin route — intentionally cross-user (admin-gated by requireAdmin).
  const where: any = {}
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { full_name: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (planFilter) where.plan = planFilter
  if (statusFilter) where.status = statusFilter

  const [rows, count] = await Promise.all([
    prisma.profiles.findMany({
      where,
      include: { _count: { select: { sites: true } } },
      orderBy: { created_at: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.profiles.count({ where }),
  ])

  const users = rows.map((u) => {
    const { _count, ...rest } = u as any
    return { ...rest, sites_count: _count?.sites || 0 }
  })

  return NextResponse.json({
    users,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { email, password, full_name, plan } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const normalizedEmail = String(email).toLowerCase().trim()

  // Reject if an auth user already exists with this email.
  const existing = await prisma.users.findFirst({
    where: { email: normalizedEmail },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 })
  }

  // Create the auth.users row (NextAuth credentials provider authenticates
  // against encrypted_password). The on_auth_user_created trigger provisions
  // the matching profiles row.
  const now = new Date()
  const newId = randomUUID()
  const encrypted_password = await bcrypt.hash(password, 10)

  const authUser = await prisma.users.create({
    data: {
      id: newId,
      email: normalizedEmail,
      encrypted_password,
      email_confirmed_at: now,
      aud: 'authenticated',
      role: 'authenticated',
      created_at: now,
      updated_at: now,
      raw_app_meta_data: { provider: 'email', providers: ['email'] },
      raw_user_meta_data: { full_name: full_name ?? null },
    },
    select: { id: true, email: true },
  })

  // Update profile with plan / full_name (profile row created by trigger).
  await prisma.profiles.update({
    where: { id: authUser.id },
    data: {
      ...(plan && plan !== 'free' ? { plan } : {}),
      ...(full_name !== undefined ? { full_name } : {}),
    },
  }).catch(() => {})

  // Log activity (non-fatal; admin_id references profiles in the schema).
  await prisma.admin_activity_log.create({
    data: {
      admin_id: auth.user!.id,
      action: 'create_user',
      target_user_id: authUser.id,
      details: { email: normalizedEmail, plan: plan || 'free' },
    },
  }).catch(() => {})

  return NextResponse.json({ user: authUser })
}
