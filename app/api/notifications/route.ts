import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: customer's notifications
export async function GET() {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get personal + broadcast (user_id IS NULL) notifications
  const { data } = await supabase
    .from('notifications')
    .select('id, title, message, type, read, created_at')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(20)

  const unread = (data || []).filter(n => !n.read).length

  return NextResponse.json({ notifications: data || [], unread })
}

// PATCH: mark notifications as read
export async function PATCH(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()

  if (ids && ids.length > 0) {
    await supabase.from('notifications').update({ read: true }).in('id', ids).eq('user_id', user.id)
  } else {
    // Mark all as read
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  }

  return NextResponse.json({ success: true })
}
