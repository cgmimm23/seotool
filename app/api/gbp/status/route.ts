import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getGoogleToken } from '@/lib/google-token'

const GBP_SCOPE = 'https://www.googleapis.com/auth/business.manage'

async function fetchAllAccounts(headers: HeadersInit) {
  const all: any[] = []
  let pageToken = ''
  for (let i = 0; i < 20; i++) {
    const url = new URL('https://mybusinessaccountmanagement.googleapis.com/v1/accounts')
    url.searchParams.set('pageSize', '100')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body)
    }
    const data = await res.json()
    if (data.accounts) all.push(...data.accounts)
    pageToken = data.nextPageToken || ''
    if (!pageToken) break
  }
  return all
}

async function fetchAllLocations(accountName: string, headers: HeadersInit) {
  const all: any[] = []
  let pageToken = ''
  const readMask = 'name,title,storefrontAddress,phoneNumbers,websiteUri,categories,profile,metadata'
  for (let i = 0; i < 50; i++) {
    const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`)
    url.searchParams.set('readMask', readMask)
    url.searchParams.set('pageSize', '100')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body)
    }
    const data = await res.json()
    if (data.locations) all.push(...data.locations)
    pageToken = data.nextPageToken || ''
    if (!pageToken) break
  }
  return all
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    const accessToken = await getGoogleToken(siteId)
    if (!accessToken) {
      return NextResponse.json({ connected: false, email: null, scopes: [], accounts: [] })
    }

    const tokenInfo = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    )
    if (!tokenInfo.ok) {
      return NextResponse.json({ connected: false, email: null, scopes: [], accounts: [] })
    }
    const info = await tokenInfo.json()
    const scopes: string[] = (info.scope || '').split(' ').filter(Boolean)
    const email: string | null = info.email || null

    if (!scopes.includes(GBP_SCOPE)) {
      return NextResponse.json({ connected: false, email, scopes, accounts: [] })
    }

    const headers = { Authorization: `Bearer ${accessToken}` }

    let accounts: any[] = []
    try {
      accounts = await fetchAllAccounts(headers)
    } catch (e: any) {
      return NextResponse.json({
        connected: true, email, scopes, accounts: [], listError: e.message,
      })
    }

    const result = await Promise.all(accounts.map(async (acct: any) => {
      let locations: any[] = []
      let locError: string | null = null
      try {
        locations = await fetchAllLocations(acct.name, headers)
      } catch (e: any) {
        locError = e.message
      }
      return {
        accountName: acct.name,
        accountDisplayName: acct.accountName || acct.name,
        accountType: acct.type || null,
        verified: !!acct.verificationState && acct.verificationState !== 'UNVERIFIED',
        locations: locations.map(l => ({
          name: l.name,
          title: l.title,
          address: l.storefrontAddress
            ? [l.storefrontAddress.addressLines?.join(', '), l.storefrontAddress.locality, l.storefrontAddress.administrativeArea].filter(Boolean).join(', ')
            : '',
          phone: l.phoneNumbers?.primaryPhone || '',
          website: l.websiteUri || '',
          primaryCategory: l.categories?.primaryCategory?.displayName || '',
        })),
        locError,
      }
    }))

    const totalLocations = result.reduce((sum, a) => sum + a.locations.length, 0)

    return NextResponse.json({
      connected: true,
      email,
      scopes,
      accounts: result,
      accountCount: result.length,
      locationCount: totalLocations,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
