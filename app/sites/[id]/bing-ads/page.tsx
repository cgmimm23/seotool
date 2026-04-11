'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type Tab = 'overview' | 'campaigns' | 'keywords' | 'settings'

function BingAdsInner({ params }: { params: { id: string } }) {
  const [connected, setConnected] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()

  useEffect(() => {
    async function check() {
      const res = await fetch('/api/bing-webmaster?endpoint=sites&siteUrl=test')
      if (res.status !== 401) {
        setConnected(true)
        loadAccounts()
      }
      setCheckingAuth(false)
      if (searchParams.get('microsoft_connected') === 'true') setConnected(true)
      if (searchParams.get('error')) setError('Microsoft connection failed. Please try again.')
    }
    check()
  }, [params.id])

  function connectMicrosoft() {
    window.location.href = `/auth/microsoft?siteId=${params.id}&returnTo=/sites/${params.id}/bing-ads`
  }

  async function loadAccounts() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/bing-ads?endpoint=accounts')
      const data = await res.json()
      if (data.error === 'not_connected') { setConnected(false); return }
      const accts = data.AccountsInfo || data.Accounts || []
      setAccounts(accts)
      if (accts.length > 0) {
        setSelectedAccount(accts[0])
        loadCampaigns(accts[0])
      }
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function loadCampaigns(account: any) {
    if (!account) return
    setLoading(true)
    try {
      const res = await fetch(`/api/bing-ads?endpoint=campaigns&accountId=${account.Id || account.id}&customerId=${account.CustomerId || ''}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCampaigns(data.Campaigns || data.campaigns || [])
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  function statusColor(status: string) {
    if (!status) return '#7a8fa8'
    const s = status.toLowerCase()
    if (s === 'active' || s === 'enabled') return '#00d084'
    if (s === 'paused') return '#ffa500'
    return '#ff4444'
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const tabBtn = (t: Tab) => ({ padding: '0.5rem 1rem', fontSize: '13px', color: tab === t ? '#1e90ff' : '#7a8fa8', cursor: 'pointer', borderBottom: `2px solid ${tab === t ? '#1e90ff' : 'transparent'}`, marginBottom: '-1px', fontWeight: tab === t ? 600 : 400, background: 'none', border: 'none', fontFamily: 'Open Sans, sans-serif' } as any)

  if (checkingAuth) return <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px' }}>Checking Microsoft connection...</div>

  if (!connected) return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Bing Ads</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Microsoft Advertising campaign performance</p>
      </div>
      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
      <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Connect Microsoft Advertising</div>
        <p style={{ fontSize: '14px', color: '#7a8fa8', marginBottom: '1.5rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>Connect your Microsoft account to view Bing Ads campaign performance, spend, clicks, and conversions.</p>
        <button onClick={connectMicrosoft} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#0078d4', border: 'none', borderRadius: '8px', padding: '0.75rem 1.5rem', fontSize: '14px', cursor: 'pointer', color: '#fff', fontFamily: 'Open Sans, sans-serif', fontWeight: 600 }}>
          <svg width="18" height="18" viewBox="0 0 21 21" fill="none"><path fill="#f25022" d="M0 0h10v10H0z"/><path fill="#00a4ef" d="M11 0h10v10H11z"/><path fill="#7fba00" d="M0 11h10v10H0z"/><path fill="#ffb900" d="M11 11h10v10H11z"/></svg>
          Connect with Microsoft
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Bing Ads</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Microsoft Advertising campaign performance</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#00d084', fontFamily: 'Roboto Mono, monospace' }}>● Connected</span>
          {accounts.length > 1 && (
            <select value={selectedAccount?.Id} onChange={e => { const a = accounts.find(a => a.Id === e.target.value); if (a) { setSelectedAccount(a); loadCampaigns(a) } }} className="form-input" style={{ width: 'auto', fontSize: '12px' }}>
              {accounts.map(a => <option key={a.Id} value={a.Id}>{a.Name || a.Id}</option>)}
            </select>
          )}
          <button onClick={loadAccounts} disabled={loading} className="btn btn-accent" style={{ fontSize: '12px' }}>
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
          <button onClick={connectMicrosoft} style={{ fontSize: '12px', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', color: '#7a8fa8', cursor: 'pointer' }}>Reconnect</button>
        </div>
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {/* Developer Token Info */}
      <div style={{ ...card, borderColor: 'rgba(30,144,255,0.2)', background: 'rgba(30,144,255,0.03)' }}>
        <div style={{ fontSize: '13px', color: '#4a6080', lineHeight: 1.5 }}>
          Bing Ads developer token is configured via the <code style={{ background: '#f0f4f8', padding: '1px 4px', borderRadius: '3px', fontSize: '12px', fontFamily: 'Roboto Mono, monospace' }}>BING_ADS_DEVELOPER_TOKEN</code> server environment variable.
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        <button style={tabBtn('overview')} onClick={() => setTab('overview')}>Overview</button>
        <button style={tabBtn('campaigns')} onClick={() => setTab('campaigns')}>Campaigns</button>
        <button style={tabBtn('settings')} onClick={() => setTab('settings')}>Settings</button>
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <>
          {selectedAccount ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '1.25rem' }}>
                {[
                  { label: 'Account', value: selectedAccount.Name || selectedAccount.Id || '—', color: '#0d1b2e' },
                  { label: 'Status', value: selectedAccount.AccountLifeCycleStatus || 'Active', color: statusColor(selectedAccount.AccountLifeCycleStatus || 'active') },
                  { label: 'Currency', value: selectedAccount.CurrencyCode || 'USD', color: '#1e90ff' },
                  { label: 'Campaigns', value: campaigns.length || '—', color: '#00d084' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
                    <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...card, padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Performance Reports</div>
                <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1rem' }}>For detailed performance data including spend, clicks, impressions, and conversions, view your reports directly in Microsoft Advertising.</p>
                <a href="https://ads.microsoft.com" target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0078d4', border: 'none', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '13px', color: '#fff', textDecoration: 'none', fontFamily: 'Open Sans, sans-serif', fontWeight: 600 }}>
                  Open Microsoft Advertising →
                </a>
              </div>
            </>
          ) : (
            <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
              <div style={{ fontSize: '13px' }}>{loading ? 'Loading account data...' : 'No ad accounts found. Make sure your Microsoft account has access to Bing Ads.'}</div>
            </div>
          )}
        </>
      )}

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        <>
          {campaigns.length > 0 ? (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Campaigns ({campaigns.length})</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Campaign', 'Status', 'Budget', 'Budget Type'].map(h => (
                    <th key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', fontWeight: 400, padding: '0.4rem 0.75rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: 'left', fontFamily: 'Roboto Mono, monospace' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {campaigns.map((c: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ padding: '0.65rem 0.75rem', fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{c.Name || c.name || '—'}</td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: `${statusColor(c.Status || c.status)}18`, color: statusColor(c.Status || c.status), fontFamily: 'Roboto Mono, monospace' }}>{c.Status || c.status || 'Unknown'}</span>
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', fontSize: '13px', color: '#4a6080', fontFamily: 'Roboto Mono, monospace' }}>{c.DailyBudget || c.Budget?.Amount ? `$${(c.DailyBudget || c.Budget?.Amount).toFixed(2)}` : '—'}</td>
                      <td style={{ padding: '0.65rem 0.75rem', fontSize: '12px', color: '#7a8fa8' }}>{c.BudgetType || c.Budget?.BudgetType || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
              <div style={{ fontSize: '13px' }}>{loading ? 'Loading campaigns...' : 'No campaigns found for this account.'}</div>
              {!loading && (
                <a href="https://ads.microsoft.com" target="_blank" style={{ display: 'inline-block', marginTop: '1rem', fontSize: '13px', color: '#1e90ff', textDecoration: 'none' }}>Create a campaign in Microsoft Advertising →</a>
              )}
            </div>
          )}
        </>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Bing Ads Settings</div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }}>Developer Token</label>
            <div style={{ fontSize: '13px', color: '#4a6080', padding: '0.55rem 0.85rem', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}>
              Configured via <code style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '12px' }}>BING_ADS_DEVELOPER_TOKEN</code> server environment variable
            </div>
            <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '6px' }}>Get your developer token at <a href="https://ads.microsoft.com/cc/settings/developer-token" target="_blank" style={{ color: '#1e90ff', textDecoration: 'none' }}>ads.microsoft.com</a></div>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }}>Microsoft Account</label>
            <button onClick={connectMicrosoft} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#0078d4', border: 'none', borderRadius: '8px', padding: '0.55rem 1rem', fontSize: '13px', cursor: 'pointer', color: '#fff', fontFamily: 'Open Sans, sans-serif', fontWeight: 600 }}>
              <svg width="14" height="14" viewBox="0 0 21 21" fill="none"><path fill="#f25022" d="M0 0h10v10H0z"/><path fill="#00a4ef" d="M11 0h10v10H11z"/><path fill="#7fba00" d="M0 11h10v10H0z"/><path fill="#ffb900" d="M11 11h10v10H11z"/></svg>
              Reconnect Microsoft Account
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BingAdsPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <BingAdsInner params={params} />
    </Suspense>
  )
}
