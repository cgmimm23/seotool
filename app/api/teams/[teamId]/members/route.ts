import { requireEnterprise } from '@/lib/enterprise'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Scope: RLS is gone (BYPASSRLS). Confirm the caller owns the team before
// any read/write on its members, otherwise a caller could touch any team.
async function ownsTeam(teamId: string, userId: string): Promise<boolean> {
  const team = await prisma.teams.findFirst({
    where: { id: teamId, owner_id: userId },
    select: { id: true },
  })
  return !!team
}

export async function GET(req: NextRequest, { params }: { params: { teamId: string } }) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  if (!(await ownsTeam(params.teamId, auth.user!.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data = await prisma.team_members.findMany({
    where: { team_id: params.teamId },
    select: {
      id: true, user_id: true, role: true, invited_email: true,
      invite_status: true, invited_at: true, accepted_at: true,
    },
  })

  // Get profile info for accepted members
  const userIds = data.filter(m => m.user_id).map(m => m.user_id as string)
  const profiles = await prisma.profiles.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, full_name: true },
  })

  const profileMap = new Map(profiles.map(p => [p.id, p]))
  const members = data.map(m => ({
    ...m,
    email: m.invited_email || (m.user_id ? profileMap.get(m.user_id)?.email : '') || '',
    full_name: (m.user_id ? profileMap.get(m.user_id)?.full_name : '') || '',
  }))

  return NextResponse.json({ members })
}

export async function POST(req: NextRequest, { params }: { params: { teamId: string } }) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  if (!(await ownsTeam(params.teamId, auth.user!.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, role } = await req.json()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  // Check if user exists
  const existingProfile = await prisma.profiles.findFirst({
    where: { email },
    select: { id: true },
  })

  try {
    await prisma.team_members.create({
      data: {
        team_id: params.teamId,
        user_id: existingProfile?.id || null,
        invited_email: email,
        role: role || 'member',
        invite_status: existingProfile ? 'accepted' : 'pending',
        accepted_at: existingProfile ? new Date() : null,
      },
    })
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'User already in team' }, { status: 400 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { teamId: string } }) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  if (!(await ownsTeam(params.teamId, auth.user!.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { memberId } = await req.json()
  if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 })

  try {
    await prisma.team_members.deleteMany({
      where: { id: memberId, team_id: params.teamId },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
