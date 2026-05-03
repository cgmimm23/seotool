'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Tab = 'gbp' | 'citations' | 'rankings'

type GbpLocation = { name: string; title: string; address: string; phone: string; website: string }
type GbpAccount = { accountName: string; accountDisplayName: string; accountType: string | null; locations: GbpLocation[] }
type GbpStatus = { connected: boolean; email: string | null; scopes: string[]; accounts: GbpAccount[] }

export default function LocalSEOPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('gbp')

  // GBP OAuth state
  const [gbpStatus, setGbpStatus] = useState<GbpStatus | null>(null)
  const [gbpStatusLoading, setGbpStatusLoading] = useState(true)
  const [gbpDisconnecting, setGbpDisconnecting] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState('')
  const [locationData, setLocationData] = useState<any>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')

  useEffect(() => { loadGbpStatus() }, [])

  async function loadGbpStatus() {
    setGbpStatusLoading(true)
    try {
      const res = await fetch('/api/gbp/status')
      const json = await res.json()
      setGbpStatus(json)
      const allLocs = (json.accounts || []).flatMap((a: GbpAccount) => a.locations)
      if (json.connected && allLocs.length === 1) {
        setSelectedLocation(allLocs[0].name)
      }
    } catch {
      setGbpStatus({ connected: false, email: null, scopes: [], accounts: [] })
    }
    setGbpStatusLoading(false)
  }

  async function connectGoogle() {
    document.cookie = `oauth_return=${encodeURIComponent(window.location.pathname)}; path=/; max-age=600; SameSite=Lax`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/business.manage https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }

  async function disconnectGoogle() {
    if (!confirm('Disconnect Google Business Profile?')) return
    setGbpDisconnecting(true)
    try {
      await fetch('/api/gbp/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      setLocationData(null)
      setSelectedLocation('')
      await loadGbpStatus()
    } finally {
      setGbpDisconnecting(false)
    }
  }

  async function loadLocationData(locationName: string) {
    if (!locationName) return
    setLocationLoading(true)
    setLocationError('')
    setLocationData(null)
    try {
      const res = await fetch(`/api/gbp/data?locationName=${encodeURIComponent(locationName)}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setLocationData(json)
    } catch (err: any) {
      setLocationError(err.message)
    } finally {
      setLocationLoading(false)
    }
  }

  // Public GBP lookup (SerpAPI) state
  const [gbpQuery, setGbpQuery] = useState('')
  const [gbpLoading, setGbpLoading] = useState(false)
  const [gbpData, setGbpData] = useState<any>(null)
  const [gbpAnalysis, setGbpAnalysis] = useState<any>(null)
  const [gbpError, setGbpError] = useState('')

  // Citations state
  const [napName, setNapName] = useState('')
  const [napAddress, setNapAddress] = useState('')
  const [napPhone, setNapPhone] = useState('')
  const [napCity, setNapCity] = useState('')
  const [napState, setNapState] = useState('')
  const [citLoading, setCitLoading] = useState(false)
  const [citResults, setCitResults] = useState<any[]>([])
  const [citError, setCitError] = useState('')

  // Rankings state
  const [rankKeyword, setRankKeyword] = useState('')
  const [rankLocation, setRankLocation] = useState('')
  const [rankLoading, setRankLoading] = useState(false)
  const [rankResults, setRankResults] = useState<any[]>([])
  const [rankError, setRankError] = useState('')
  const [rankSearched, setRankSearched] = useState('')

  function scoreColor(s: number) {
    if (s >= 80) return '#00d084'
    if (s >= 60) return '#ffa500'
    return '#ff4444'
  }

  // -- GBP CHECKER ------------------------------------------
  async function checkGBP() {
    if (!gbpQuery) return
    setGbpLoading(true)
    setGbpError('')
    setGbpData(null)
    setGbpAnalysis(null)

    try {
      // Use server-side SerpAPI proxy
      const res = await fetch('/api/local-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'gbp', query: gbpQuery }),
      })
      if (!res.ok) throw new Error('Local SEO API error ' + res.status)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const place = data.local_results?.[0]
      if (!place) throw new Error('No business found. Try a more specific search.')

      setGbpData(place)

      // Use server-side AI to analyze the listing
      const aiRes = await fetch('/api/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are a local SEO expert. Analyze a Google Business Profile listing and score it. Return ONLY valid JSON, no markdown.

Schema:
{
  "score": 72,
  "grade": "Good",
  "summary": "one sentence",
  "checks": [
    { "status": "pass|fail|warn", "title": "", "detail": "" }
  ]
}

Check for: business name completeness, category accuracy, address presence, phone number, website link, hours of operation, photos count, review count, review rating, review responses, business description, Q&A section, posts activity, attribute completeness. Score 0-100.

Analyze this Google Business Profile listing:
${JSON.stringify(place, null, 2)}`,
        }),
      })

      const aiData = await aiRes.json()
      const text = aiData.text || ''
      let analysis
      try { analysis = JSON.parse(text.replace(/```json|```/g, '').trim()) }
      catch { const m = text.match(/\{[\s\S]*\}/); if (m) analysis = JSON.parse(m[0]) }
      setGbpAnalysis(analysis)

    } catch (err: any) {
      setGbpError(err.message)
    } finally {
      setGbpLoading(false)
    }
  }

  // -- CITATION TRACKER -------------------------------------
  async function checkCitations() {
    if (!napName || !napCity) return
    setCitLoading(true)
    setCitError('')
    setCitResults([])

    try {
      // Use server-side API for citation checks
      const res = await fetch('/api/local-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'citations', napName, napCity, napPhone }),
      })
      if (!res.ok) throw new Error('Citation check error ' + res.status)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCitResults(data.results || [])
    } catch (err: any) {
      setCitError(err.message)
    } finally {
      setCitLoading(false)
    }
  }

  // -- LOCAL RANKINGS ----------------------------------------
  async function checkLocalRankings() {
    if (!rankKeyword || !rankLocation) return
    setRankLoading(true)
    setRankError('')
    setRankResults([])

    try {
      const res = await fetch('/api/local-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rankings', keyword: rankKeyword, location: rankLocation }),
      })
      if (!res.ok) throw new Error('Rankings API error ' + res.status)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setRankResults(data.organic_results || [])
      setRankSearched(`"${rankKeyword}" in ${rankLocation}`)

      // Also get local pack if available
      if (data.local_results) {
        setRankResults(prev => [...(data.local_results || []).map((r: any) => ({ ...r, isLocal: true })), ...prev])
      }
    } catch (err: any) {
      setRankError(err.message)
    } finally {
      setRankLoading(false)
    }
  }

  const tabStyle = (t: Tab) => ({
    padding: '0.5rem 1.25rem',
    fontSize: '13px',
    color: tab === t ? '#1e90ff' : '#7a8fa8',
    cursor: 'pointer',
    borderBottom: `2px solid ${tab === t ? '#1e90ff' : 'transparent'}`,
    marginBottom: '-1px',
    fontWeight: tab === t ? 600 : 400,
    background: 'none',
    border: 'none',
    fontFamily: 'Open Sans, sans-serif',
  } as any)

  const cardStyle = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Local SEO</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Google Business Profile, citations, and local keyword rankings</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        <button style={tabStyle('gbp')} onClick={() => setTab('gbp')}>GBP Checker</button>
        <button style={tabStyle('citations')} onClick={() => setTab('citations')}>Citation Tracker</button>
        <button style={tabStyle('rankings')} onClick={() => setTab('rankings')}>Local Rankings</button>
      </div>

      {/* -- GBP TAB -- */}
      {tab === 'gbp' && (
        <div>
          {/* OAuth-gated: user's own Google Business Profile */}
          {gbpStatusLoading ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Checking Google connection...</div>
          ) : !gbpStatus?.connected ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '2.5rem' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>Connect Your Google Business Profile</div>
              <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '0.5rem', maxWidth: '460px', margin: '0 auto 0.5rem' }}>Sign in with Google to pull live insights — searches, calls, direction requests, website clicks, photos, and reviews — directly from your verified Google Business Profile.</p>
              {gbpStatus?.email && (
                <p style={{ fontSize: '12px', color: '#ff4444', marginBottom: '0.75rem' }}>
                  Signed in as {gbpStatus.email}, but the Business Profile scope was not granted. Click below to grant access.
                </p>
              )}
              <div style={{ marginTop: '1.25rem' }}>
                <button onClick={connectGoogle} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', padding: '0.7rem 1.4rem', fontSize: '14px', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Connect with Google
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '0.85rem' }}>Read-only access to your Google Business Profile</p>
            </div>
          ) : (
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '0.75rem' }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600 }}>Your Google Business Profile</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '12px', background: 'rgba(0,208,132,0.1)', color: '#00a36b', fontFamily: 'Roboto Mono, monospace' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00d084' }} />
                    {gbpStatus.email || 'Connected'}
                  </span>
                  <button onClick={disconnectGoogle} disabled={gbpDisconnecting} style={{ background: 'none', border: 'none', color: '#7a8fa8', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', fontFamily: 'Open Sans, sans-serif' }}>
                    {gbpDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </div>

              {(() => {
                const allLocs = (gbpStatus.accounts || []).flatMap(a => a.locations.map(l => ({ ...l, accountDisplayName: a.accountDisplayName })))
                if (allLocs.length === 0) {
                  return <div style={{ fontSize: '12px', color: '#7a8fa8', padding: '8px 12px', background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.2)', borderRadius: '8px' }}>No verified locations found on this Google account. Verify your listing in Google Business Profile, then refresh.</div>
                }
                return (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      value={selectedLocation}
                      onChange={e => { setSelectedLocation(e.target.value); loadLocationData(e.target.value) }}
                      className="form-input"
                      style={{ width: 'auto', minWidth: '280px', fontFamily: 'Open Sans, sans-serif', fontSize: '13px' }}
                    >
                      <option value="">Select a location...</option>
                      {allLocs.map(l => (
                        <option key={l.name} value={l.name}>
                          {l.title}{l.address ? ' — ' + l.address : ''}
                        </option>
                      ))}
                    </select>
                    {selectedLocation && (
                      <button className="btn btn-accent" onClick={() => loadLocationData(selectedLocation)} disabled={locationLoading}>
                        {locationLoading ? 'Loading...' : 'Refresh Insights'}
                      </button>
                    )}
                  </div>
                )
              })()}

              {locationError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '0.75rem', color: '#ff4444', fontSize: '12px', marginTop: '0.75rem' }}>{locationError}</div>}

              {locationLoading && <div style={{ textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading insights...</div>}

              {locationData && !locationLoading && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '10px' }}>
                    {[
                      { label: 'Impressions', value: locationData.totals?.total_impressions?.toLocaleString() || '0', color: '#0d1b2e' },
                      { label: 'Calls', value: locationData.totals?.calls?.toLocaleString() || '0', color: '#1e90ff' },
                      { label: 'Website Clicks', value: locationData.totals?.website_clicks?.toLocaleString() || '0', color: '#00d084' },
                      { label: 'Direction Requests', value: locationData.totals?.direction_requests?.toLocaleString() || '0', color: '#ffa500' },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                        <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: '#4a6080', padding: '0.5rem 0' }}>
                    {locationData.average_rating != null && <span>Rating: <strong>{locationData.average_rating}</strong></span>}
                    {locationData.total_review_count != null && <span>Reviews: <strong>{locationData.total_review_count}</strong></span>}
                    {locationData.posts && <span>Posts: <strong>{locationData.posts.length}</strong></span>}
                  </div>
                  {locationData.insights_error && <div style={{ fontSize: '11px', color: '#ffa500', marginTop: '0.5rem' }}>Insights API: {locationData.insights_error}</div>}
                </div>
              )}
            </div>
          )}

          <div style={cardStyle}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '0.5rem' }}>Look up any business (public)</div>
            <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '0.75rem' }}>Audit any Google Business Profile — yours or a competitor's — using public Google Maps data. No login required.</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" className="form-input" placeholder="Business name + city (e.g. Joe's Plumbing San Antonio TX)" value={gbpQuery} onChange={e => setGbpQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkGBP()} style={{ flex: 1 }} />
              <button className="btn btn-accent" onClick={checkGBP} disabled={gbpLoading}>{gbpLoading ? 'Searching...' : 'Check GBP'}</button>
            </div>
          </div>

          {gbpError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{gbpError}</div>}

          {gbpLoading && <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Fetching GBP data and running AI analysis...</div>}

          {gbpData && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                {gbpData.thumbnail && <img src={gbpData.thumbnail} alt="" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '17px', fontWeight: 700 }}>{gbpData.title}</div>
                  <div style={{ fontSize: '13px', color: '#7a8fa8', marginTop: '2px' }}>{gbpData.type}</div>
                  <div style={{ fontSize: '13px', color: '#4a6080', marginTop: '4px' }}>{gbpData.address}</div>
                  {gbpData.phone && <div style={{ fontSize: '13px', color: '#4a6080', marginTop: '2px' }}>{gbpData.phone}</div>}
                  {gbpData.rating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffa500' }}>{gbpData.rating}</span>
                      <span style={{ fontSize: '12px', color: '#7a8fa8' }}>({gbpData.reviews?.toLocaleString()} reviews)</span>
                    </div>
                  )}
                </div>
                {gbpAnalysis && (
                  <div style={{ width: '70px', height: '70px', borderRadius: '50%', border: `3px solid ${scoreColor(gbpAnalysis.score)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: scoreColor(gbpAnalysis.score), lineHeight: 1 }}>{gbpAnalysis.score}</span>
                    <span style={{ fontSize: '9px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>GBP</span>
                  </div>
                )}
              </div>

              {gbpData.hours && (
                <div style={{ fontSize: '12px', color: gbpData.hours.includes('Open') ? '#00d084' : '#ff4444', marginBottom: '0.75rem', fontWeight: 600 }}>{gbpData.hours}</div>
              )}

              {gbpAnalysis && (
                <>
                  <div style={{ fontSize: '13px', color: '#4a6080', marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fb', borderRadius: '8px' }}>{gbpAnalysis.summary}</div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace', marginBottom: '0.5rem' }}>Optimization checks</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {gbpAnalysis.checks?.map((c: any, i: number) => {
                      const colors: any = { pass: '#00d084', fail: '#ff4444', warn: '#ffa500' }
                      const icons: any = { pass: 'OK', fail: 'X', warn: '!' }
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: '10px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', borderLeft: `2px solid ${colors[c.status]}`, background: '#f8f9fb' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: `${colors[c.status]}18`, color: colors[c.status], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, marginTop: '1px' }}>{icons[c.status]}</div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{c.title}</div>
                            <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>{c.detail}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* -- CITATIONS TAB -- */}
      {tab === 'citations' && (
        <div>
          <div style={cardStyle}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem' }}>Enter your NAP (Name, Address, Phone)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label className="form-label">Business Name</label>
                <input type="text" className="form-input" placeholder="Joe's Plumbing" value={napName} onChange={e => setNapName(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input type="text" className="form-input" placeholder="(210) 555-5555" value={napPhone} onChange={e => setNapPhone(e.target.value)} />
              </div>
              <div>
                <label className="form-label">City</label>
                <input type="text" className="form-input" placeholder="San Antonio" value={napCity} onChange={e => setNapCity(e.target.value)} />
              </div>
              <div>
                <label className="form-label">State</label>
                <input type="text" className="form-input" placeholder="TX" value={napState} onChange={e => setNapState(e.target.value)} />
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label className="form-label">Street Address</label>
              <input type="text" className="form-input" placeholder="123 Main St" value={napAddress} onChange={e => setNapAddress(e.target.value)} />
            </div>
            <button className="btn btn-accent" onClick={checkCitations} disabled={citLoading}>{citLoading ? 'Checking directories...' : 'Check Citations'}</button>
          </div>

          {citError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{citError}</div>}

          {citLoading && <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Checking 8 major directories...</div>}

          {citResults.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>
                Citation Results
                <span style={{ fontSize: '12px', fontWeight: 400, color: '#7a8fa8', marginLeft: '8px' }}>
                  {citResults.filter(r => r.found).length} of {citResults.length} directories found
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {citResults.map((r, i) => {
                  const napColors: any = {
                    consistent: { bg: 'rgba(0,208,132,0.1)', color: '#00d084', label: 'Consistent' },
                    partial: { bg: 'rgba(255,165,0,0.1)', color: '#ffa500', label: 'Partial match' },
                    inconsistent: { bg: 'rgba(255,68,68,0.1)', color: '#ff4444', label: 'Inconsistent' },
                    unknown: { bg: 'rgba(0,0,0,0.05)', color: '#7a8fa8', label: 'Not found' },
                  }
                  const nc = napColors[r.found ? r.napMatch : 'unknown']
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: '12px', alignItems: 'center', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', background: '#f8f9fb' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{r.name}</div>
                      <div style={{ fontSize: '12px', color: '#7a8fa8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.found ? <a href={r.url} target="_blank" style={{ color: '#1e90ff', textDecoration: 'none' }}>{r.title || r.url}</a> : 'Not found in this directory'}
                      </div>
                      <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: nc.bg, color: nc.color, fontFamily: 'Roboto Mono, monospace', whiteSpace: 'nowrap' }}>{nc.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -- LOCAL RANKINGS TAB -- */}
      {tab === 'rankings' && (
        <div>
          <div style={cardStyle}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem' }}>Check local keyword rankings</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label className="form-label">Keyword</label>
                <input type="text" className="form-input" placeholder="plumber near me" value={rankKeyword} onChange={e => setRankKeyword(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Location</label>
                <input type="text" className="form-input" placeholder="San Antonio, TX" value={rankLocation} onChange={e => setRankLocation(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-accent" onClick={checkLocalRankings} disabled={rankLoading}>{rankLoading ? 'Fetching...' : 'Check Rankings'}</button>
          </div>

          {rankError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{rankError}</div>}

          {rankLoading && <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Fetching local rankings for {rankKeyword}...</div>}

          {rankResults.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>
                Results for {rankSearched}
              </div>
              {rankResults.map((r: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '12px', padding: '0.85rem 0', borderBottom: i < rankResults.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: r.isLocal ? 'rgba(30,144,255,0.1)' : '#f0f4f8', border: r.isLocal ? '1px solid rgba(30,144,255,0.3)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', flexShrink: 0, marginTop: '2px', color: r.isLocal ? '#1e90ff' : '#4a6080' }}>
                    {r.isLocal ? 'MAP' : r.position || i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {r.isLocal && <div style={{ fontSize: '10px', color: '#1e90ff', fontFamily: 'Roboto Mono, monospace', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Local Pack</div>}
                    <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '2px', fontFamily: 'Roboto Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.displayed_link || r.address || ''}</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e90ff', lineHeight: 1.3 }}>{r.title}</div>
                    {r.snippet && <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '3px', lineHeight: 1.5 }}>{r.snippet}</div>}
                    {r.rating && <div style={{ fontSize: '12px', color: '#ffa500', marginTop: '3px' }}>{r.rating} stars ({r.reviews} reviews)</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
