import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getGoogleToken } from '@/lib/google-token'

const GBP_SCOPE = 'https://www.googleapis.com/auth/business.manage'

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

    const acctRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers })
    if (!acctRes.ok) {
      const body = await acctRes.text()
      return NextResponse.json({
        connected: true,
        email,
        scopes,
        accounts: [],
        listError: body,
      })
    }
    const acctData = await acctRes.json()
    const accounts = acctData.accounts || []

    const result = await Promise.all(accounts.map(async (acct: any) => {
      try {
        const locRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${acct.name}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri`,
          { headers }
        )
        const locData = await locRes.json()
        const locations = (locData.locations || []).map((l: any) => ({
          name: l.name,
          title: l.title,
          address: l.storefrontAddress
            ? [l.storefrontAddress.addressLines?.join(', '), l.storefrontAddress.locality, l.storefrontAddress.administrativeArea].filter(Boolean).join(', ')
            : '',
          phone: l.phoneNumbers?.primaryPhone || '',
          website: l.websiteUri || '',
        }))
        return {
          accountName: acct.name,
          accountDisplayName: acct.accountName || acct.name,
          accountType: acct.type || null,
          locations,
        }
      } catch {
        return {
          accountName: acct.name,
          accountDisplayName: acct.accountName || acct.name,
          accountType: acct.type || null,
          locations: [],
        }
      }
    }))

    return NextResponse.json({ connected: true, email, scopes, accounts: result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
