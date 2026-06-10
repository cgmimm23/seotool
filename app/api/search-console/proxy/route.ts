import { getGoogleToken } from '@/lib/google-token'
import { getUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint, body, siteId } = await req.json()

  const accessToken = await getGoogleToken(siteId)
  if (!accessToken) {
    return NextResponse.json({ error: 'Google account not connected. Sign in with Google first.' }, { status: 401 })
  }

  const url = endpoint.startsWith('http') ? endpoint : `https://www.googleapis.com${endpoint}`

  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()

  if (!res.ok) {
    return NextResponse.json({ error: data.error?.message || 'Google API error' }, { status: res.status })
  }

  return NextResponse.json(data)
}
