import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { getGoogleToken } from '@/lib/google-token'

const ADS_SCOPE = 'https://www.googleapis.com/auth/adwords'

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

    if (!scopes.includes(ADS_SCOPE)) {
      return NextResponse.json({ connected: false, email, scopes, accounts: [] })
    }

    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || ''
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'developer-token': developerToken,
    }

    const listRes = await fetch('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', { headers })
    if (!listRes.ok) {
      const body = await listRes.text()
      return NextResponse.json({
        connected: true,
        email,
        scopes,
        accounts: [],
        listError: body,
      })
    }
    const listJson = await listRes.json()
    const resourceNames: string[] = listJson.resourceNames || []
    const customerIds = resourceNames.map(rn => rn.split('/')[1]).filter(Boolean)

    const accounts = await Promise.all(customerIds.map(async (cid) => {
      try {
        const r = await fetch(`https://googleads.googleapis.com/v14/customers/${cid}/googleAds:search`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: 'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.manager FROM customer LIMIT 1',
          }),
        })
        if (!r.ok) return { customerId: cid, name: cid, manager: false }
        const j = await r.json()
        const c = j.results?.[0]?.customer
        return {
          customerId: cid,
          name: c?.descriptiveName || cid,
          currency: c?.currencyCode || null,
          manager: !!c?.manager,
        }
      } catch {
        return { customerId: cid, name: cid, manager: false }
      }
    }))

    return NextResponse.json({ connected: true, email, scopes, accounts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
