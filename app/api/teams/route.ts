import { requireEnterprise } from '@/lib/enterprise'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  // Scope: only teams owned by the caller.
  const data = await prisma.teams.findMany({
    where: { owner_id: auth.user!.id },
    include: {
      team_members: {
        select: { id: true, user_id: true, role: true, invited_email: true, invite_status: true },
      },
    },
  })

  return NextResponse.json({ teams: data })
}

export async function POST(req: NextRequest) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const team = await prisma.teams.create({
    data: { name, owner_id: auth.user!.id },
  })

  // Add owner as admin member
  await prisma.team_members.create({
    data: {
      team_id: team.id,
      user_id: auth.user!.id,
      role: 'admin',
      invite_status: 'accepted',
      accepted_at: new Date(),
    },
  })

  return NextResponse.json({ team }, { status: 201 })
}
