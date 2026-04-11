import { requireEnterprise } from '@/lib/enterprise'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { data, error } = await auth.supabase
    .from('teams')
    .select('*, team_members(id, user_id, role, invited_email, invite_status)')
    .or(`owner_id.eq.${auth.user!.id}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ teams: data })
}

export async function POST(req: NextRequest) {
  const auth = await requireEnterprise()
  if (auth.error) return auth.error

  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const { data: team, error } = await auth.supabase
    .from('teams')
    .insert({ name, owner_id: auth.user!.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Add owner as admin member
  await auth.supabase.from('team_members').insert({
    team_id: team.id,
    user_id: auth.user!.id,
    role: 'admin',
    invite_status: 'accepted',
    accepted_at: new Date().toISOString(),
  })

  return NextResponse.json({ team }, { status: 201 })
}
