import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const accessToken = session.provider_token
    if (!accessToken) return NextResponse.json({ error: 'No Google access token. Please reconnect your Google account.' }, { status: 401 })

    const body = await request.json()
    const { action } = body

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }

    // Get accounts list
    if (action === 'get_accounts') {
      const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Could not fetch GBP accounts')
      }
      const data = await res.json()
      return NextResponse.json({ accounts: data.accounts || [] })
    }

    // Create new location
    if (action === 'create_location') {
      const { accountId, location } = body
      if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

      const payload = {
        languageCode: 'en',
        storeCode: '',
        title: location.bizName,
        phoneNumbers: { primaryPhone: location.bizPhone },
        categories: {
          primaryCategory: { displayName: location.bizCategory },
        },
        websiteUri: location.bizWebsite,
        regularHours: {
          periods: Object.entries(location.hours)
            .filter(([, h]: any) => h.open)
            .map(([day, h]: any) => ({
              openDay: day.toUpperCase(),
              closeDay: day.toUpperCase(),
              openTime: { hours: parseInt(h.from.split(':')[0]), minutes: parseInt(h.from.split(':')[1]) },
              closeTime: { hours: parseInt(h.to.split(':')[0]), minutes: parseInt(h.to.split(':')[1]) },
            })),
        },
        storefrontAddress: {
          addressLines: [location.bizAddress],
          locality: location.bizCity,
          administrativeArea: location.bizState,
          postalCode: location.bizZip,
          regionCode: 'US',
        },
        profile: { description: location.description },
        openInfo: {
          status: 'OPEN',
          openingDate: location.openingDate ? {
            year: parseInt(location.openingDate.split('-')[0]),
            month: parseInt(location.openingDate.split('-')[1]),
            day: parseInt(location.openingDate.split('-')[2]),
          } : undefined,
        },
        serviceArea: location.isServiceAreaBiz ? {
          businessType: 'CUSTOMER_LOCATION_ONLY',
          places: {
            placeInfos: location.serviceAreas
              .split('\n')
              .filter(Boolean)
              .slice(0, 20)
              .map((area: string) => ({ name: area.trim() })),
          },
        } : undefined,
      }

      const res = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations`,
        { method: 'POST', headers, body: JSON.stringify(payload) }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Could not create location')

      return NextResponse.json({ location: data, success: true })
    }

    // Get verification options
    if (action === 'get_verification_options') {
      const { locationName } = body
      const res = await fetch(
        `https://mybusinessverifications.googleapis.com/v1/${locationName}/fetchVerificationOptions`,
        { method: 'POST', headers, body: JSON.stringify({ languageCode: 'en' }) }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Could not fetch verification options')
      return NextResponse.json({ options: data.options || [] })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
