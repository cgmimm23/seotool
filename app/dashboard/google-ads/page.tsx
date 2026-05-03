'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Tab = 'overview' | 'campaigns' | 'keywords' | 'search-terms'

type Account = { customerId: string; name: string; currency?: string | null; manager?: boolean }

export default function GoogleAdsPage() {
  const [status, setStatus] = useState<{ connected: boolean; email: string | null; accounts: Account[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [days, setDays] = useState(30)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [tab, setTab] = useState<Tab>('overview')
  const supabase = createClient()

  useEffect(() => { checkConnection() }, [])

  async function checkConnection() {
    setCheckingAuth(true)
    try {
      const res = await fetch('/api/google-ads/status')
      const json = await res.json()
      setStatus(json)
      if (json.connected && json.accounts?.length === 1) {
        setCustomerId(json.accounts[0].customerId)
      }
    } catch {
      setStatus({ connected: false, email: null, accounts: [] })
    }
    setCheckingAuth(false)
  }

  async function connectGoogle() {
    document.cookie = `oauth_return=${encodeURIComponent(window.location.pathname)}; path=/; max-age=600; SameSite=Lax`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly',
        queryParams: { access_type: 'offline', prompt: 'select_account consent' },
      },
    })
  }

  async function disconnect() {
    if (!confirm('Disconnect Google Ads? You will need to reconnect to load data.')) return
    setDisconnecting(true)
    try {
      await fetch('/api/google-ads/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      setData(null)
      setCustomerId('')
      await checkConnection()
    } finally {
      setDisconnecting(false)
    }
  }

  async function fetchData() {
    if (!customerId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/google-ads?customerId=${customerId}&days=${days}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const tabBtn = (t: Tab) => ({ padding: '0.5rem 1rem', fontSize: '13px', color: tab === t ? '#1e90ff' : '#7a8fa8', cursor: 'pointer', borderBottom: `2px solid ${tab === t ? '#1e90ff' : 'transparent'}`, marginBottom: '-1px', fontWeight: tab === t ? 600 : 400, background: 'none', border: 'none', fontFamily: 'Open Sans, sans-serif' } as any)

  const maxClicks = data?.daily ? Math.max(...data.daily.map((d: any) => d.clicks), 1) : 1

  function statusColor(s: string) {
    if (s === 'ENABLED') return '#00d084'
    if (s === 'PAUSED') return '#ffa500'
    return '#7a8fa8'
  }

  function qsColor(qs: any) {
    if (qs === 'N/A') return '#7a8fa8'
    const n = parseInt(qs)
    if (n >= 7) return '#00d084'
    if (n >= 4) return '#ffa500'
    return '#ff4444'
  }

  if (checkingAuth) return <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Checking Google connection...</div>

  if (!status?.connected) return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Google Ads</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Campaign performance, keywords, search terms, and ROAS</p>
      </div>
      <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Connect Google Ads</div>
        <p style={{ fontSize: '14px', color: '#7a8fa8', marginBottom: '0.5rem', maxWidth: '480px', margin: '0 auto 0.5rem' }}>Connect your Google account to see campaign performance, keyword bids, quality scores, search terms, budget pacing, and ROAS.</p>
        {status?.email && (
          <p style={{ fontSize: '12px', color: '#ff4444', marginBottom: '1rem' }}>
            Signed in as {status.email} but the Google Ads scope is not granted. Click below to grant access.
          </p>
        )}
        <div style={{ marginTop: '1.5rem' }}>
          <button onClick={connectGoogle} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', padding: '0.75rem 1.5rem', fontSize: '14px', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Connect with Google
          </button>
        </div>
        <p style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '1rem' }}>Read-only access to your Google Ads account</p>
      </div>
    </div>
  )

  const accounts = status.accounts || []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Google Ads</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Campaign performance, keywords, search terms, ROAS</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '12px', background: 'rgba(0,208,132,0.1)', color: '#00a36b', fontFamily: 'Roboto Mono, monospace' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00d084' }} />
            {status.email || 'Connected'}
          </span>
          <button onClick={disconnect} disabled={disconnecting} style={{ background: 'none', border: 'none', color: '#7a8fa8', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', fontFamily: 'Open Sans, sans-serif' }}>
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {accounts.length > 0 ? (
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="form-input" style={{ width: 'auto', minWidth: '260px', fontFamily: 'Open Sans, sans-serif', fontSize: '13px' }}>
            <option value="">Select a Google Ads account...</option>
            {accounts.map(a => (
              <option key={a.customerId} value={a.customerId}>
                {a.name}{a.manager ? ' (Manager)' : ''} — {a.customerId.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
              </option>
            ))}
          </select>
        ) : (
          <input type="text" className="form-input" placeholder="Customer ID (e.g. 123-456-7890)" value={customerId} onChange={e => setCustomerId(e.target.value)} style={{ width: '220px', fontFamily: 'Roboto Mono, monospace', fontSize: '12px' }} />
        )}
        <select value={days} onChange={e => setDays(+e.target.value)} className="form-input" style={{ width: 'auto' }}>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <button onClick={fetchData} className="btn btn-accent" style={{ fontSize: '12px' }} disabled={!customerId || loading}>
          {loading ? 'Loading...' : 'Load Data'}
        </button>
      </div>

      {accounts.length === 0 && (
        <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '1rem', padding: '8px 12px', background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.2)', borderRadius: '8px' }}>
          No Google Ads accounts found for this Google login. Enter a Customer ID manually, or reconnect with a Google account that has access. Find your Customer ID in Google Ads at the top right of the screen.
        </div>
      )}

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
      {loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading Google Ads data...</div>}

      {!data && !loading && !error && (
        <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '4px' }}>
            {customerId ? 'Click Load Data to pull campaign performance' : 'Pick an account above to get started'}
          </div>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'Total Spend', value: data.totals.cost, color: '#ff4444' },
              { label: 'Clicks', value: data.totals.clicks.toLocaleString(), color: '#1e90ff' },
              { label: 'Impressions', value: data.totals.impressions.toLocaleString(), color: '#0d1b2e' },
              { label: 'Conversions', value: data.totals.conversions.toLocaleString(), color: '#00d084' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'CTR', value: data.totals.ctr, color: '#ffa500' },
              { label: 'Avg CPC', value: data.totals.avgCpc, color: '#0d1b2e' },
              { label: 'ROAS', value: data.totals.roas + 'x', color: parseFloat(data.totals.roas) >= 3 ? '#00d084' : '#ffa500' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
            <button style={tabBtn('overview')} onClick={() => setTab('overview')}>Overview</button>
            <button style={tabBtn('campaigns')} onClick={() => setTab('campaigns')}>Campaigns</button>
            <button style={tabBtn('keywords')} onClick={() => setTab('keywords')}>Keywords</button>
            <button style={tabBtn('search-terms')} onClick={() => setTab('search-terms')}>Search Terms</button>
          </div>

          {/* Overview tab */}
          {tab === 'overview' && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Clicks over time</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px', marginBottom: '6px' }}>
                {data.daily.map((d: any, i: number) => (
                  <div key={i} title={`${d.date}: ${d.clicks} clicks, ${d.cost} spend`} style={{ flex: 1, borderRadius: '2px 2px 0 0', height: `${Math.max(4, (d.clicks / maxClicks) * 100)}%`, background: i >= data.daily.length - 7 ? '#1e90ff' : 'rgba(30,144,255,0.25)', minWidth: 0, cursor: 'pointer' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>
                <span>{data.daily[0]?.date}</span><span>{data.daily[data.daily.length - 1]?.date}</span>
              </div>
            </div>
          )}

          {/* Campaigns tab */}
          {tab === 'campaigns' && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Campaigns ({data.campaigns.length})</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Campaign', 'Status', 'Clicks', 'Impressions', 'Cost', 'Conv.', 'CTR', 'Avg CPC', 'Budget'].map(h => <th key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', fontWeight: 400, padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: 'left', fontFamily: 'Roboto Mono, monospace', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                <tbody>{data.campaigns.map((c: any, i: number) => (
                  <tr key={i} style={{ borderBottom: i < data.campaigns.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', fontWeight: 600, color: '#0d1b2e', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}><span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: c.status === 'ENABLED' ? 'rgba(0,208,132,0.1)' : 'rgba(255,165,0,0.1)', color: statusColor(c.status), fontFamily: 'Roboto Mono, monospace' }}>{c.status}</span></td>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', fontWeight: 600, color: '#1e90ff' }}>{c.clicks.toLocaleString()}</td>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{c.impressions.toLocaleString()}</td>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', fontWeight: 600, color: '#ff4444' }}>{c.cost}</td>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', color: '#00d084' }}>{c.conversions}</td>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', color: '#ffa500', fontFamily: 'Roboto Mono, monospace' }}>{c.ctr}</td>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace' }}>{c.avgCpc}</td>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{c.budget}/day</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {/* Keywords tab */}
          {tab === 'keywords' && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Keywords ({data.keywords.length})</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Keyword', 'Match', 'QS', 'Clicks', 'Impressions', 'Cost', 'Conv.', 'Avg CPC'].map(h => <th key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', fontWeight: 400, padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: 'left', fontFamily: 'Roboto Mono, monospace', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                <tbody>{data.keywords.map((k: any, i: number) => (
                  <tr key={i} style={{ borderBottom: i < data.keywords.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', fontWeight: 600, color: '#0d1b2e', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.text}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}><span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: '#f0f4f8', color: '#4a6080', fontFamily: 'Roboto Mono, monospace' }}>{k.matchType?.replace('_', ' ')}</span></td>
                    <td style={{ padding: '0.6rem 0.5rem' }}><span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: qsColor(k.qualityScore) }}>{k.qualityScore}/10</span></td>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', fontWeight: 600, color: '#1e90ff' }}>{k.clicks.toLocaleString()}</td>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{k.impressions.toLocaleString()}</td>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', fontWeight: 600, color: '#ff4444' }}>{k.cost}</td>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', color: '#00d084' }}>{k.conversions}</td>
                    <td style={{ padding: '0.6rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace' }}>{k.avgCpc}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {/* Search terms tab */}
          {tab === 'search-terms' && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Search Terms Report</div>
              <p style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '1rem' }}>Actual search queries that triggered your ads</p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Search Term', 'Clicks', 'Impressions', 'CTR', 'Cost', 'Conv.'].map(h => <th key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', fontWeight: 400, padding: '0.4rem 0.75rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: 'left', fontFamily: 'Roboto Mono, monospace' }}>{h}</th>)}</tr></thead>
                <tbody>{data.searchTerms.map((s: any, i: number) => (
                  <tr key={i} style={{ borderBottom: i < data.searchTerms.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '13px', color: '#0d1b2e', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.term}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '12px', fontWeight: 600, color: '#1e90ff' }}>{s.clicks.toLocaleString()}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{s.impressions.toLocaleString()}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '12px', color: '#ffa500', fontFamily: 'Roboto Mono, monospace' }}>{s.ctr}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '12px', fontWeight: 600, color: '#ff4444' }}>{s.cost}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '12px', color: '#00d084' }}>{s.conversions}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
