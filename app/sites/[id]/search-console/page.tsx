'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function SearchConsolePage({ params }: { params: { id: string } }) {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [siteUrl, setSiteUrl] = useState('')
  const [sites, setSites] = useState<string[]>([])
  const [days, setDays] = useState(30)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [sortBy, setSortBy] = useState<'clicks'|'impressions'|'position'>('clicks')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { checkConnection() }, [])

  const [connectedEmail, setConnectedEmail] = useState('')

  async function checkConnection() {
    setCheckingAuth(true)
    const { data: site } = await supabase.from('sites')
      .select('google_email, google_access_token, gsc_site_url')
      .eq('id', params.id).single()
    if (site?.google_access_token) {
      setConnected(true)
      setConnectedEmail(site.google_email || '')
      if (site.gsc_site_url) setSiteUrl(site.gsc_site_url)
      await fetchSites()
    }
    setCheckingAuth(false)
  }

  async function connectGoogle() {
    document.cookie = `oauth_return=${encodeURIComponent(window.location.pathname)}; path=/; max-age=600; SameSite=Lax`
    document.cookie = `oauth_site_id=${params.id}; path=/; max-age=600; SameSite=Lax`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      }
    })
  }

  async function disconnectGoogle() {
    if (!confirm('Disconnect Google from this site?')) return
    await supabase.from('sites').update({
      google_email: null, google_access_token: null, google_refresh_token: null, google_token_expires_at: null,
    }).eq('id', params.id)
    setConnected(false)
    setConnectedEmail('')
    setSites([])
    setData(null)
    setSiteUrl('')
  }

  async function fetchSites() {
    try {
      const res = await fetch('/api/search-console/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: '/webmasters/v3/sites', siteId: params.id }),
      })
      const data = await res.json()
      const siteList = (data.siteEntry || []).map((s: any) => s.siteUrl)
      setSites(siteList)
      setSiteUrl(prev => prev || siteList[0] || '')
    } catch (err) { console.error('Could not fetch sites', err) }
  }

  async function fetchData() {
    if (!siteUrl) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/search-console?siteId=${params.id}&siteUrl=${encodeURIComponent(siteUrl)}&days=${days}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
      await supabase.from('sites').update({ gsc_site_url: siteUrl }).eq('id', params.id)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function syncToRankHistory() {
    if (!siteUrl) return
    setSyncing(true)
    setSyncResult(null)
    setError('')
    try {
      const res = await fetch('/api/gsc-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl, siteId: params.id, days: 90 }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setSyncResult(json.message || `Synced ${json.synced} data points`)
    } catch (err: any) { setError(err.message) }
    finally { setSyncing(false) }
  }

  useEffect(() => { if (connected && siteUrl) fetchData() }, [siteUrl, days, connected])

  function positionColor(pos: number) {
    if (pos <= 3) return '#00d084'
    if (pos <= 10) return '#ffa500'
    return '#ff4444'
  }

  const sortedKeywords = data?.keywords ? [...data.keywords].sort((a: any, b: any) => {
    if (sortBy === 'position') return parseFloat(a.position) - parseFloat(b.position)
    return b[sortBy] - a[sortBy]
  }) : []

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  if (checkingAuth) return <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Checking Google connection...</div>

  if (!connected) return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Search Console</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Keyword rankings and search performance from Google</p>
      </div>
      <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Connect Google Search Console</div>
        <p style={{ fontSize: '14px', color: '#7a8fa8', marginBottom: '1.5rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>Connect your Google account to see every keyword your site ranks for, impressions, clicks, CTR, and position data.</p>
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
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Search Console</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Keyword rankings and search performance from Google</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {sites.length > 0 && (
            <select value={siteUrl} onChange={e => setSiteUrl(e.target.value)} className="form-input" style={{ width: 'auto', fontFamily: 'Roboto Mono, monospace', fontSize: '12px' }}>
              {sites.map(s => <option key={s} value={s}>{s.replace(/^https?:\/\//, '').replace(/\/$/, '')}</option>)}
            </select>
          )}
          <select value={days} onChange={e => setDays(+e.target.value)} className="form-input" style={{ width: 'auto' }}>
            <option value={7}>Last 7 days</option>
            <option value={28}>Last 28 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={fetchData} className="btn btn-ghost" style={{ fontSize: '12px' }}>Refresh</button>
          <button onClick={syncToRankHistory} disabled={syncing || !siteUrl} className="btn btn-accent" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
            {syncing ? 'Syncing...' : '↑ Sync to Rank History'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', padding: '8px 12px', background: 'rgba(0,208,132,0.08)', border: '1px solid rgba(0,208,132,0.2)', borderRadius: '8px', fontSize: '12px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00d084' }} />
        <div style={{ color: '#0d1b2e', fontWeight: 600 }}>Connected as {connectedEmail || 'Google user'}</div>
        <button onClick={connectGoogle} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#2367a0', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Switch account</button>
        <button onClick={disconnectGoogle} style={{ background: 'transparent', border: 'none', color: '#7a8fa8', fontSize: '12px', cursor: 'pointer' }}>Disconnect</button>
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {syncResult && (
        <div style={{ background: 'rgba(0,208,132,0.08)', border: '1px solid rgba(0,208,132,0.2)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#00d084', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>✓ {syncResult}</span>
          <a href={`/sites/${params.id}/rank-history`} style={{ fontSize: '12px', color: '#00d084', textDecoration: 'underline' }}>View Rank History →</a>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading Search Console data...</div>}

      {data && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'Total Clicks', value: data.totals.clicks.toLocaleString(), color: '#1e90ff' },
              { label: 'Impressions', value: data.totals.impressions.toLocaleString(), color: '#0d1b2e' },
              { label: 'Avg CTR', value: data.totals.ctr + '%', color: '#00d084' },
              { label: 'Avg Position', value: '#' + data.totals.position, color: positionColor(parseFloat(data.totals.position)) },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>All Keywords ({data.keywords.length})</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['clicks', 'impressions', 'position'] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)} style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', border: `1px solid ${sortBy === s ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`, background: sortBy === s ? 'rgba(30,144,255,0.08)' : 'transparent', color: sortBy === s ? '#1e90ff' : '#7a8fa8', fontFamily: 'Open Sans, sans-serif', textTransform: 'capitalize' }}>{s}</button>
                ))}
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Keyword', 'Clicks', 'Impressions', 'CTR', 'Position'].map(h => (
                  <th key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', fontWeight: 400, padding: '0.4rem 0.75rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: 'left', fontFamily: 'Roboto Mono, monospace' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {sortedKeywords.map((k: any, i: number) => (
                  <tr key={i} style={{ borderBottom: i < sortedKeywords.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '13px', color: '#0d1b2e', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.keyword}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '13px', fontWeight: 600, color: '#1e90ff' }}>{k.clicks.toLocaleString()}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '13px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{k.impressions.toLocaleString()}</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '13px', color: '#00d084', fontFamily: 'Roboto Mono, monospace' }}>{k.ctr}%</td>
                    <td style={{ padding: '0.6rem 0.75rem', fontSize: '13px', fontFamily: 'Roboto Mono, monospace', fontWeight: 600, color: positionColor(parseFloat(k.position)) }}>#{k.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
