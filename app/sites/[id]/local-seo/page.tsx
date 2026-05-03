'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Tab = 'gbp' | 'citations' | 'rankings'

export default function LocalSEOPage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState<Tab>('gbp')
  const supabase = createClient()

  // GBP connect + data
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [connected, setConnected] = useState(false)
  const [statusEmail, setStatusEmail] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [data, setData] = useState<any>(null)
  const [days, setDays] = useState(28)
  const [gbpLoading, setGbpLoading] = useState(false)
  const [gbpError, setGbpError] = useState('')
  const [disconnecting, setDisconnecting] = useState(false)

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const tabBtn = (t: Tab) => ({ padding: '0.5rem 1.25rem', fontSize: '13px', cursor: 'pointer', borderBottom: `2px solid ${tab === t ? '#1e90ff' : 'transparent'}`, marginBottom: '-1px', fontWeight: tab === t ? 600 : 400, background: 'none', border: 'none', color: tab === t ? '#1e90ff' : '#7a8fa8', fontFamily: 'Open Sans, sans-serif' } as any)

  useEffect(() => { checkConn() }, [])

  async function checkConn() {
    setCheckingAuth(true)
    try {
      const res = await fetch(`/api/gbp/status?siteId=${params.id}`)
      const json = await res.json()
      setStatusEmail(json.email || null)
      if (json.connected) {
        setConnected(true)
        const apiAccounts = (json.accounts || []).map((a: any) => ({
          account: { name: a.accountName, accountName: a.accountDisplayName },
          locations: a.locations || [],
        }))
        setAccounts(apiAccounts)
        const firstLoc = apiAccounts[0]?.locations?.[0]
        if (firstLoc?.name) setSelectedLocation(firstLoc.name)
      } else {
        setConnected(false)
      }
    } catch {
      setConnected(false)
    }
    setCheckingAuth(false)
  }

  async function connect() {
    document.cookie = `oauth_return=${encodeURIComponent(window.location.pathname)}; path=/; max-age=600; SameSite=Lax`
    document.cookie = `oauth_site_id=${params.id}; path=/; max-age=600; SameSite=Lax`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/business.manage',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }

  async function disconnect() {
    if (!confirm('Disconnect Google Business Profile from this site?')) return
    setDisconnecting(true)
    try {
      await fetch('/api/gbp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: params.id }),
      })
      setData(null)
      setSelectedLocation('')
      setAccounts([])
      await checkConn()
    } finally {
      setDisconnecting(false)
    }
  }

  useEffect(() => {
    if (!selectedLocation) return
    setGbpLoading(true); setGbpError('')
    fetch(`/api/gbp/data?siteId=${params.id}&locationName=${encodeURIComponent(selectedLocation)}&days=${days}`)
      .then(r => r.json())
      .then(j => { if (j.error) throw new Error(j.error); setData(j) })
      .catch(e => setGbpError(e.message))
      .finally(() => setGbpLoading(false))
  }, [selectedLocation, days, params.id])

  const allLocations = accounts.flatMap(a => (a.locations || []).map((l: any) => ({ ...l, accountName: a.account.accountName || a.account.name })))

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Local SEO</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Google Business Profile performance, citations, and local rankings</p>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        <button style={tabBtn('gbp')} onClick={() => setTab('gbp')}>Business Profile</button>
        <button style={tabBtn('citations')} onClick={() => setTab('citations')}>Citations</button>
        <button style={tabBtn('rankings')} onClick={() => setTab('rankings')}>Local Rankings</button>
      </div>

      {tab === 'gbp' && (
        <>
          {checkingAuth ? (
            <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px' }}>Checking Google connection...</div>
          ) : !connected ? (
            <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>Connect Google Business Profile</div>
              <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '0.5rem', maxWidth: '460px', margin: '0 auto 0.5rem', lineHeight: 1.6 }}>
                See real performance data for your Google Business Profile — searches, map views, calls, website clicks, direction requests, and recent posts.
              </p>
              {statusEmail && (
                <p style={{ fontSize: '12px', color: '#ff4444', marginBottom: '0.75rem' }}>
                  Signed in as {statusEmail}, but the Business Profile scope was not granted. Click below to grant access.
                </p>
              )}
              <button onClick={connect} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', padding: '0.65rem 1.25rem', fontSize: '13px', cursor: 'pointer', marginTop: '0.75rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Connect with Google
              </button>
              <p style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '0.85rem' }}>Read-only access to your Google Business Profile</p>
            </div>
          ) : (
            <>
              <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '12px', background: 'rgba(0,208,132,0.1)', color: '#00a36b', fontFamily: 'Roboto Mono, monospace', fontSize: '12px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00d084' }} />
                  {statusEmail || 'Connected'}
                </span>
                <button onClick={disconnect} disabled={disconnecting} style={{ background: 'none', border: 'none', color: '#7a8fa8', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', fontFamily: 'Open Sans, sans-serif' }}>
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
                <div style={{ height: '20px', width: '1px', background: 'rgba(0,0,0,0.08)' }} />
                <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Location</div>
                <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} className="form-input" style={{ flex: 1, minWidth: '220px', fontSize: '13px' }}>
                  <option value="">— Pick a location —</option>
                  {allLocations.map(l => <option key={l.name} value={l.name}>{l.title || l.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[7, 28, 90].map(d => (
                    <button key={d} onClick={() => setDays(d)} style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '11px', fontWeight: days === d ? 700 : 400, border: days === d ? '1px solid #1e90ff' : '1px solid rgba(0,0,0,0.1)', background: days === d ? 'rgba(30,144,255,0.08)' : '#fff', color: days === d ? '#1e90ff' : '#7a8fa8', cursor: 'pointer', fontFamily: 'Roboto Mono, monospace' }}>{d}d</button>
                  ))}
                </div>
              </div>

              {gbpError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{gbpError}</div>}
              {gbpLoading && <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading GBP data...</div>}

              {data?.profile?.title && (
                <div style={{ ...card }}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '17px' }}>{data.profile.title}</div>
                  <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '4px' }}>
                    {data.profile.categories?.primaryCategory?.displayName}{data.profile.storefrontAddress ? ' · ' + [data.profile.storefrontAddress.locality, data.profile.storefrontAddress.administrativeArea].filter(Boolean).join(', ') : ''}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '4px' }}>
                    {data.profile.phoneNumbers?.primaryPhone}{data.profile.websiteUri ? ' · ' : ''}
                    {data.profile.websiteUri && <a href={data.profile.websiteUri} target="_blank" rel="noreferrer" style={{ color: '#1e90ff' }}>{data.profile.websiteUri}</a>}
                  </div>
                </div>
              )}

              {data?.totals && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
                  {[
                    { label: 'Total Views', value: data.totals.total_impressions.toLocaleString() },
                    { label: 'Calls', value: data.totals.calls.toLocaleString() },
                    { label: 'Website Clicks', value: data.totals.website_clicks.toLocaleString() },
                    { label: 'Directions', value: data.totals.direction_requests.toLocaleString() },
                    { label: 'Mobile Maps', value: data.totals.impressions_mobile_maps.toLocaleString() },
                    { label: 'Mobile Search', value: data.totals.impressions_mobile_search.toLocaleString() },
                    { label: 'Desktop Maps', value: data.totals.impressions_desktop_maps.toLocaleString() },
                    { label: 'Desktop Search', value: data.totals.impressions_desktop_search.toLocaleString() },
                    { label: 'Messages', value: data.totals.messages.toLocaleString() },
                    { label: 'Bookings', value: data.totals.bookings.toLocaleString() },
                    { label: 'Reviews', value: (data.total_review_count || 0).toLocaleString() },
                    { label: 'Avg Rating', value: data.average_rating ? `${data.average_rating.toFixed(1)}★` : '—' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
                      <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: '#0d1b2e' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {data?.insights_error && (
                <div style={{ ...card, background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.3)', fontSize: '12px', color: '#b17800' }}>
                  Insights error: {data.insights_error}. The Business Profile Performance API must be enabled in your Google Cloud project.
                </div>
              )}

              {data?.posts?.length > 0 && (
                <div style={card}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Recent Posts</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.posts.map((p: any) => (
                      <div key={p.name} style={{ padding: '10px', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', display: 'flex', gap: '10px' }}>
                        {p.media?.[0]?.googleUrl && <img src={p.media[0].googleUrl} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{new Date(p.createTime).toLocaleDateString()} · {p.topicType}</div>
                          <div style={{ fontSize: '13px', marginTop: '2px' }}>{(p.summary || '').slice(0, 280)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === 'citations' && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Citation Tracker</div>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Coming soon — check NAP consistency across Yelp, YP, BBB, Bing Places, Apple Maps, Foursquare.</p>
        </div>
      )}
      {tab === 'rankings' && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Local Rankings</div>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Coming soon — local pack position tracking with geo targeting.</p>
        </div>
      )}
    </div>
  )
}
