import { getGoogleToken } from '@/lib/google-token'
import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = await getGoogleToken()
  if (!token) return NextResponse.json({ error: 'Google account not connected' }, { status: 401 })

  const { action, accountName, locationName, reviewName, comment, flagType, pageSize } = await req.json()

  try {
    if (action === 'accounts') {
      const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.error?.message || 'Failed to fetch accounts' }, { status: res.status })
      return NextResponse.json({ accounts: data.accounts || [] })
    }

    if (action === 'locations' && accountName) {
      const res = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.error?.message || 'Failed to fetch locations' }, { status: res.status })
      return NextResponse.json({ locations: data.locations || [] })
    }

    if (action === 'reviews' && locationName) {
      const res = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=${pageSize || 50}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data.error?.message || 'Failed to fetch reviews' }, { status: res.status })
      return NextResponse.json({ reviews: data.reviews || [] })
    }

    if (action === 'reply' && reviewName && comment) {
      const res = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      })
      if (!res.ok) {
        const data = await res.json()
        return NextResponse.json({ error: data.error?.message || 'Failed to post reply' }, { status: res.status })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'deleteReply' && reviewName) {
      const res = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) return NextResponse.json({ error: 'Failed to delete reply' }, { status: res.status })
      return NextResponse.json({ success: true })
    }

    if (action === 'flag' && reviewName && flagType) {
      const res = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}:flag`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagType }),
      })
      if (!res.ok) {
        const data = await res.json()
        return NextResponse.json({ error: data.error?.message || 'Failed to flag review' }, { status: res.status })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
