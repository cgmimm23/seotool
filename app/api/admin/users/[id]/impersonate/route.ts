import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const profile = await prisma.profiles.findUnique({
    where: { id: params.id },
    select: { email: true },
  })

  if (!profile?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // TODO(security): impersonation previously issued a Supabase magic link via
  // supabase.auth.admin.generateLink(). NextAuth has no equivalent admin
  // sign-in-as flow, so there is no migrated mechanism to mint a user session
  // here. A deliberate impersonation flow (signed admin-impersonation token
  // consumed by a NextAuth credentials/callback path) must be designed before
  // this endpoint can work. Returning 501 so it fails closed rather than
  // silently logging an impersonation that never grants access.
  await prisma.admin_activity_log.create({
    data: {
      admin_id: auth.user!.id,
      action: 'impersonate_user_attempt',
      target_user_id: params.id,
      details: { email: profile.email },
    },
  }).catch(() => {})

  return NextResponse.json(
    { error: 'User impersonation is not available after the migration off Supabase Auth.' },
    { status: 501 }
  )
}
