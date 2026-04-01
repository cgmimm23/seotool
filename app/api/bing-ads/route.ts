import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BING_ADS_API = 'https://campaign.api.bingads.microsoft.com/api/advertiser/campaignmanagement/v13'
const REPORTING_API = 'https://reporting.api.bingads.microsoft.com/Api/Advertiser/Reporting/V13'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const endpoint = searchParams.get('endpoint')
  const accountId = searchParams.get('accountId') || ''
  const customerId = searchParams.get('customerId') || ''

  const token = req.cookies.get('ms_access_token')?.value
  if (!token) return NextResponse.json({ error: 'not_connected' }, { status: 401 })

  try {
    if (endpoint === 'accounts') {
      // Get all ad accounts for this user
      const res = await fetch('https://clientcenter.api.bingads.microsoft.com/api/clientcenter/v13/CustomerManagementService.svc/GetAccountsInfo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      return NextResponse.json(data)
    }

    if (endpoint === 'campaigns') {
      const res = await fetch(`${BING_ADS_API}/CampaignManagementService.svc/GetCampaignsByAccountId`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'CustomerAccountId': accountId,
          'CustomerId': customerId,
          'DeveloperToken': process.env.BING_ADS_DEVELOPER_TOKEN || '',
        },
        body: JSON.stringify({ AccountId: accountId }),
      })
      const data = await res.json()
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('ms_access_token')?.value
  if (!token) return NextResponse.json({ error: 'not_connected' }, { status: 401 })

  try {
    const { endpoint, accountId, customerId, reportRequest } = await req.json()

    if (endpoint === 'performance-report') {
      // Submit a performance report request
      const submitRes = await fetch(`${REPORTING_API}/ReportingService.svc/SubmitGenerateReport`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'CustomerAccountId': accountId,
          'CustomerId': customerId,
          'DeveloperToken': process.env.BING_ADS_DEVELOPER_TOKEN || '',
        },
        body: JSON.stringify({
          ReportRequest: {
            Format: 'Csv',
            Language: 'English',
            ReportName: 'PerformanceReport',
            ReturnOnlyCompleteData: false,
            ...reportRequest,
          },
        }),
      })
      const data = await submitRes.json()
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
