'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Property = { propertyId: string; displayName: string; accountName: string }

export default function AnalyticsPage({ params }: { params: { id: string } }) {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [days, setDays] = useState(30)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const supabase = createClient()

  useEffect(() => { checkConnection() }, [])

  useEffect(() => {
    if (connected && propertyId && !data && !loading) fetchData()
  }, [connected, propertyId])

  async function checkConnection() {
    setCheckingAuth(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setCheckingAuth(false); return }

    let hasToken = !!session.provider_token
    if (!hasToken) {
      const { data: profile } = await supabase.from('profiles')
        .select('google_access_token').eq('id', session.user.id).single()
      hasToken = !!profile?.google_access_token
    }

    if (hasToken) {
      setConnected(true)
      const { data: site } = await supabase.from('sites')
        .select('ga4_property_id').eq('id', params.id).single()
      if (site?.ga4_property_id) setPropertyId(site.ga4_property_id)
      await loadProperties()
    }
    setCheckingAuth(false)
  }

  async function loadProperties() {
    setLoadingProperties(true)
    try {
      const res = await fetch('/api/analytics?action=list_properties')
      const json = await res.json()
      if (json.properties) {
        setProperties(json.properties)
        setPropertyId(prev => prev || json.properties[0]?.propertyId || '')
      } else if (json.error) {
        setError(json.error)
      }
    } catch (err: any) { setError(err.message) }
    finally { setLoadingProperties(false) }
  }

  async function connectGoogle() {
    document.cookie = `oauth_return=${encodeURIComponent(window.location.pathname)}; path=/; max-age=600; SameSite=Lax`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
  }

  async function fetchData() {
    if (!propertyId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/analytics?propertyId=${propertyId}&days=${days}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
      await supabase.from('sites').update({ ga4_property_id: propertyId }).eq('id', params.id)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  const maxSessions = data?.daily ? Math.max(...data.daily.map((d: any) => d.sessions), 1) : 1
  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const channelColors: any = { 'Organic Search': '#00d084', 'Direct': '#1e90ff', 'Referral': '#ffa500', 'Organic Social': '#9b59b6', 'Paid Search': '#e74c3c', 'Email': '#f39c12', 'Unassigned': '#7a8fa8' }

  if (checkingAuth) return <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Checking Google connection...</div>

  if (!connected) return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}><h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Analytics</h2><p style={{ fontSize: '13px', color: '#7a8fa8' }}>Site traffic and user behavior via Google Analytics 4</p></div>
      <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Connect Google Analytics</div>
        <p style={{ fontSize: '14px', color: '#7a8fa8', marginBottom: '1.5rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>One-click connect. We&apos;ll auto-detect all your GA4 properties — no ID copy-pasting.</p>
        <button onClick={connectGoogle} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', padding: '0.75rem 1.5rem', fontSize: '14px', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Connect with Google
        </button>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div><h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Analytics</h2><p style={{ fontSize: '13px', color: '#7a8fa8' }}>Site traffic and user behavior — Google Analytics 4</p></div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {loadingProperties ? (
            <div style={{ fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>Loading properties…</div>
          ) : properties.length > 0 ? (
            <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className="form-input" style={{ minWidth: '260px', fontSize: '13px' }}>
              {properties.map(p => (
                <option key={p.propertyId} value={p.propertyId}>{p.displayName} — {p.accountName}</option>
              ))}
            </select>
          ) : (
            <input type="text" className="form-input" placeholder="GA4 Property ID" value={propertyId} onChange={e => setPropertyId(e.target.value)} style={{ width: '220px', fontFamily: 'Roboto Mono, monospace', fontSize: '12px' }} />
          )}
          <select value={days} onChange={e => setDays(+e.target.value)} className="form-input" style={{ width: 'auto' }}><option value={7}>Last 7 days</option><option value={28}>Last 28 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select>
          <button onClick={fetchData} className="btn btn-accent" style={{ fontSize: '12px' }} disabled={!propertyId || loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      {properties.length === 0 && !loadingProperties && (
        <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '1rem', padding: '8px 12px', background: 'rgba(228,179,79,0.08)', border: '1px solid rgba(228,179,79,0.25)', borderRadius: '8px' }}>
          Could not auto-detect GA4 properties. Enter your Property ID manually from Analytics → Admin → Property Settings.
        </div>
      )}

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}
      {loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading GA4 data...</div>}

      {data && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'Sessions', value: data.totals.sessions.toLocaleString(), color: '#1e90ff' },
              { label: 'Users', value: data.totals.users.toLocaleString(), color: '#0d1b2e' },
              { label: 'Bounce Rate', value: data.totals.avgBounceRate + '%', color: parseFloat(data.totals.avgBounceRate) > 60 ? '#ff4444' : '#00d084' },
              { label: 'Avg Session', value: data.totals.avgDuration, color: '#0d1b2e' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Sessions over time</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px' }}>
                {data.daily.map((d: any, i: number) => (
                  <div key={i} title={`${d.date}: ${d.sessions} sessions`} style={{ flex: 1, borderRadius: '2px 2px 0 0', height: `${Math.max(4, (d.sessions / maxSessions) * 100)}%`, background: i >= data.daily.length - 7 ? '#1e90ff' : 'rgba(30,144,255,0.25)', minWidth: 0, cursor: 'pointer' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>
                <span>{data.daily[0]?.date}</span><span>{data.daily[data.daily.length - 1]?.date}</span>
              </div>
            </div>

            {data.sources && (
              <div style={card}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Traffic Sources</div>
                {data.sources.map((s: any, i: number) => {
                  const pct = Math.round(s.sessions / data.totals.sessions * 100)
                  const color = channelColors[s.channel] || '#7a8fa8'
                  return (
                    <div key={i} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                        <span style={{ color: '#4a6080' }}>{s.channel}</span>
                        <span style={{ fontFamily: 'Roboto Mono, monospace', fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div style={{ height: '4px', background: '#f0f4f8', borderRadius: '2px' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {(data.pages || data.devices) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {data.pages && (
                <div style={card}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Top Pages</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Page', 'Sessions', 'Users', 'Bounce'].map(h => <th key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', fontWeight: 400, padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: 'left', fontFamily: 'Roboto Mono, monospace' }}>{h}</th>)}</tr></thead>
                    <tbody>{data.pages.map((p: any, i: number) => (
                      <tr key={i}>
                        <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: '#4a6080', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.page || '/'}</td>
                        <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', fontWeight: 600 }}>{p.sessions.toLocaleString()}</td>
                        <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', color: '#7a8fa8' }}>{p.users.toLocaleString()}</td>
                        <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', color: parseFloat(p.bounceRate) > 60 ? '#ff4444' : '#00d084', fontFamily: 'Roboto Mono, monospace' }}>{p.bounceRate}%</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}

              {data.devices && (
                <div style={card}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Device Breakdown</div>
                  {data.devices.map((d: any, i: number) => {
                    const pct = Math.round(d.sessions / data.totals.sessions * 100)
                    const colors: any = { mobile: '#1e90ff', desktop: '#00d084', tablet: '#ffa500' }
                    const color = colors[d.device.toLowerCase()] || '#7a8fa8'
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem 0', borderBottom: i < data.devices.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: '13px', color: '#4a6080', textTransform: 'capitalize' }}>{d.device}</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'Roboto Mono, monospace' }}>{pct}%</div>
                        <div style={{ fontSize: '12px', color: '#7a8fa8' }}>{d.sessions.toLocaleString()} sessions</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
