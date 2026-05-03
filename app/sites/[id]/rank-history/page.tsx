'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'

type SourcePositions = { gsc: number | null; bing: number | null; serp: number | null }
type KeywordRow = { keyword: string; positions: Record<string, SourcePositions> }
type RankData = { dates: string[]; rows: KeywordRow[] }

const DAYS_OPTIONS = [7, 14, 30, 60, 90]

function positionColor(pos: number | null | undefined): string {
  if (pos === null || pos === undefined) return '#7a8fa8'
  if (pos <= 3) return '#00d084'
  if (pos <= 10) return '#1e90ff'
  if (pos <= 20) return '#ffa500'
  return '#ff4444'
}

function positionLabel(pos: number | null | undefined): string {
  if (pos === null || pos === undefined) return '—'
  return String(Math.round(pos))
}

function RankHistoryInner({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState<'gsc' | 'tracked'>('gsc')
  const [days, setDays] = useState(30)

  // GSC state
  const [gscLoading, setGscLoading] = useState(false)
  const [gscError, setGscError] = useState('')
  const [gscData, setGscData] = useState<any>(null)
  const [gscConnected, setGscConnected] = useState(false)
  const [gscSiteUrl, setGscSiteUrl] = useState<string>('')
  const [gscSites, setGscSites] = useState<string[]>([])
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [gscSort, setGscSort] = useState<'clicks' | 'impressions' | 'position' | 'ctr'>('clicks')

  // Tracked keywords state
  const [trackedLoading, setTrackedLoading] = useState(false)
  const [trackedError, setTrackedError] = useState('')
  const [trackedData, setTrackedData] = useState<RankData | null>(null)
  const [trackedSearch, setTrackedSearch] = useState('')

  const supabase = createClient()

  useEffect(() => {
    checkGscConnection()
  }, [params.id])

  useEffect(() => {
    if (tab === 'gsc' && gscConnected && gscSiteUrl) fetchGsc()
    if (tab === 'tracked') fetchTracked()
  }, [tab, gscSiteUrl, days, gscConnected])

  async function checkGscConnection() {
    setCheckingAuth(true)
    const { data: site } = await supabase.from('sites').select('google_access_token, google_email, gsc_site_url').eq('id', params.id).single()
    if (site?.google_access_token) {
      setGscConnected(true)
      if (site.gsc_site_url) setGscSiteUrl(site.gsc_site_url)
      await fetchGscSites()
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
        queryParams: { access_type: 'offline', prompt: 'select_account consent' },
      },
    })
  }

  async function fetchGscSites() {
    try {
      const res = await fetch('/api/search-console/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: '/webmasters/v3/sites', siteId: params.id }),
      })
      const data = await res.json()
      const list = (data.siteEntry || []).map((s: any) => s.siteUrl)
      setGscSites(list)
      setGscSiteUrl(prev => prev || list[0] || '')
    } catch {}
  }

  async function fetchGsc() {
    if (!gscSiteUrl) return
    setGscLoading(true)
    setGscError('')
    try {
      const res = await fetch(`/api/search-console?siteId=${params.id}&siteUrl=${encodeURIComponent(gscSiteUrl)}&days=${days}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setGscData(json)
      await supabase.from('sites').update({ gsc_site_url: gscSiteUrl }).eq('id', params.id)
    } catch (e: any) { setGscError(e.message) }
    finally { setGscLoading(false) }
  }

  async function fetchTracked() {
    setTrackedLoading(true)
    setTrackedError('')
    try {
      const res = await fetch(`/api/rank-history?siteId=${params.id}&days=${days}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setTrackedData(json)
    } catch (e: any) { setTrackedError(e.message) }
    finally { setTrackedLoading(false) }
  }

  async function syncGscToTracked() {
    if (!gscSiteUrl) return
    try {
      await fetch('/api/gsc-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl: gscSiteUrl, siteId: params.id, days: 90 }),
      })
      if (tab === 'tracked') fetchTracked()
    } catch {}
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  const sortedGscKeywords = gscData?.keywords ? [...gscData.keywords].sort((a: any, b: any) => {
    if (gscSort === 'position') return parseFloat(a.position) - parseFloat(b.position)
    return parseFloat(b[gscSort]) - parseFloat(a[gscSort])
  }) : []

  // For the tracked table, compute the latest rank per keyword across sources
  const trackedRows = (trackedData?.rows || []).map(row => {
    const dates = trackedData?.dates || []
    const lastDate = dates[dates.length - 1]
    const firstDate = dates[0]
    const last = lastDate ? row.positions[lastDate] : null
    const first = firstDate ? row.positions[firstDate] : null
    const bestLast = [last?.gsc, last?.bing, last?.serp].filter((v): v is number => typeof v === 'number').sort((a, b) => a - b)[0] ?? null
    const bestFirst = [first?.gsc, first?.bing, first?.serp].filter((v): v is number => typeof v === 'number').sort((a, b) => a - b)[0] ?? null
    const delta = (bestFirst != null && bestLast != null) ? (bestFirst - bestLast) : null
    return { keyword: row.keyword, last, first, bestLast, delta }
  }).filter(r => r.keyword.toLowerCase().includes(trackedSearch.toLowerCase()))

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Rank History</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Real Google rankings from Search Console, plus the keywords you&apos;re tracking manually</p>
      </div>

      {/* Tab switcher + days filter */}
      <div style={{ ...card, display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', flex: 1, minWidth: '280px' }}>
          {[
            { key: 'gsc', label: 'Search Console' },
            { key: 'tracked', label: 'Tracked Keywords' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={{ padding: '0.5rem 1rem', fontSize: '13px', color: tab === t.key ? '#1e90ff' : '#7a8fa8', cursor: 'pointer', borderBottom: `2px solid ${tab === t.key ? '#1e90ff' : 'transparent'}`, marginBottom: '-1px', fontWeight: tab === t.key ? 600 : 400, background: 'none', border: 'none', fontFamily: 'Open Sans, sans-serif' }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Last</span>
          {DAYS_OPTIONS.map(d => (
            <button key={d} onClick={() => setDays(d)} style={{ padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '11px', fontWeight: days === d ? 700 : 400, border: days === d ? '1px solid #1e90ff' : '1px solid rgba(0,0,0,0.1)', background: days === d ? 'rgba(30,144,255,0.08)' : '#fff', color: days === d ? '#1e90ff' : '#7a8fa8', cursor: 'pointer', fontFamily: 'Roboto Mono, monospace' }}>{d}d</button>
          ))}
        </div>
      </div>

      {/* GSC TAB */}
      {tab === 'gsc' && (
        <>
          {checkingAuth ? (
            <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px' }}>Checking Google connection...</div>
          ) : !gscConnected ? (
            <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>Connect Google Search Console</div>
              <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1.25rem', maxWidth: '460px', margin: '0 auto 1.25rem', lineHeight: 1.6 }}>
                See every keyword Google actually showed your site for, with clicks, impressions, CTR, and position data. Free. Covers thousands of queries you&apos;d never think to track manually.
              </p>
              <button onClick={connectGoogle} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', padding: '0.65rem 1.25rem', fontSize: '13px', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Connect with Google
              </button>
            </div>
          ) : (
            <>
              {/* Property picker + sync button */}
              <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Property</div>
                <select value={gscSiteUrl} onChange={e => setGscSiteUrl(e.target.value)} className="form-input" style={{ flex: 1, minWidth: '280px', fontSize: '13px' }}>
                  <option value="">— Select GSC property —</option>
                  {gscSites.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={syncGscToTracked} className="btn btn-ghost" style={{ fontSize: '12px', padding: '6px 12px' }}>Sync to Tracked Keywords</button>
              </div>

              {/* Totals */}
              {gscData?.totals && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
                  {[
                    { label: 'Clicks', value: gscData.totals.clicks.toLocaleString() },
                    { label: 'Impressions', value: gscData.totals.impressions.toLocaleString() },
                    { label: 'Avg CTR', value: `${gscData.totals.ctr}%` },
                    { label: 'Avg Position', value: gscData.totals.position },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
                      <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                      <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: '#0d1b2e' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {gscError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{gscError}</div>}

              {gscLoading && <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Pulling Search Console data...</div>}

              {!gscLoading && sortedGscKeywords.length > 0 && (
                <div style={card}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Top Keywords ({sortedGscKeywords.length})</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {[
                            { key: null, label: 'Keyword' },
                            { key: 'position', label: 'Avg Position' },
                            { key: 'clicks', label: 'Clicks' },
                            { key: 'impressions', label: 'Impressions' },
                            { key: 'ctr', label: 'CTR' },
                          ].map(h => (
                            <th key={h.label} onClick={() => h.key && setGscSort(h.key as any)} style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: h.key ? 'right' : 'left', fontFamily: 'Roboto Mono, monospace', cursor: h.key ? 'pointer' : 'default' }}>
                              {h.label}{gscSort === h.key ? ' ↓' : ''}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedGscKeywords.map((k: any, i: number) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                            <td style={{ padding: '0.55rem 0.75rem', fontSize: '13px', color: '#0d1b2e' }}>{k.keyword}</td>
                            <td style={{ padding: '0.55rem 0.75rem', fontSize: '13px', color: positionColor(parseFloat(k.position)), fontWeight: 600, fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>{k.position}</td>
                            <td style={{ padding: '0.55rem 0.75rem', fontSize: '13px', color: '#0d1b2e', fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>{k.clicks.toLocaleString()}</td>
                            <td style={{ padding: '0.55rem 0.75rem', fontSize: '13px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>{k.impressions.toLocaleString()}</td>
                            <td style={{ padding: '0.55rem 0.75rem', fontSize: '13px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>{k.ctr}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!gscLoading && gscData && sortedGscKeywords.length === 0 && (
                <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px' }}>No keyword data from Search Console yet for this period.</div>
              )}
            </>
          )}
        </>
      )}

      {/* TRACKED TAB */}
      {tab === 'tracked' && (
        <>
          <div style={{ ...card, display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="text" placeholder="Filter keywords..." value={trackedSearch} onChange={e => setTrackedSearch(e.target.value)} className="form-input" style={{ flex: 1, fontSize: '13px' }} />
            <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>
              <span style={{ color: '#00d084' }}>■ 1–3</span>
              <span style={{ color: '#1e90ff' }}>■ 4–10</span>
              <span style={{ color: '#ffa500' }}>■ 11–20</span>
              <span style={{ color: '#ff4444' }}>■ 21+</span>
            </div>
          </div>

          {trackedError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{trackedError}</div>}

          {trackedLoading && <div style={{ ...card, textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading tracked keywords...</div>}

          {!trackedLoading && trackedRows.length > 0 && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Tracked Keywords ({trackedRows.length})</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Keyword', 'Best Current', 'GSC', 'Bing', 'SERP', 'Change'].map((h, i) => (
                        <th key={h} style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: i === 0 ? 'left' : 'right', fontFamily: 'Roboto Mono, monospace' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trackedRows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td style={{ padding: '0.55rem 0.75rem', fontSize: '13px', color: '#0d1b2e' }}>{r.keyword}</td>
                        <td style={{ padding: '0.55rem 0.75rem', fontSize: '14px', color: positionColor(r.bestLast), fontWeight: 700, fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>{positionLabel(r.bestLast)}</td>
                        <td style={{ padding: '0.55rem 0.75rem', fontSize: '12px', color: positionColor(r.last?.gsc ?? null), fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>{positionLabel(r.last?.gsc)}</td>
                        <td style={{ padding: '0.55rem 0.75rem', fontSize: '12px', color: positionColor(r.last?.bing ?? null), fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>{positionLabel(r.last?.bing)}</td>
                        <td style={{ padding: '0.55rem 0.75rem', fontSize: '12px', color: positionColor(r.last?.serp ?? null), fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>{positionLabel(r.last?.serp)}</td>
                        <td style={{ padding: '0.55rem 0.75rem', fontSize: '12px', color: r.delta == null ? '#7a8fa8' : r.delta > 0 ? '#00d084' : r.delta < 0 ? '#ff4444' : '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>
                          {r.delta == null ? '—' : r.delta === 0 ? '=' : `${r.delta > 0 ? '↑' : '↓'}${Math.abs(r.delta)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!trackedLoading && trackedRows.length === 0 && (
            <div style={{ ...card }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>No tracked keywords yet</div>
              <div style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1rem', lineHeight: 1.6 }}>
                Add keywords from the Keywords page or run SERP checks from the SERP Tracker. Or sync directly from Search Console using the button on the GSC tab above — that imports every query Google showed you for.
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a href={`/sites/${params.id}/keywords`} className="btn btn-accent" style={{ fontSize: '12px', padding: '6px 14px', textDecoration: 'none' }}>Add keywords</a>
                <a href={`/sites/${params.id}/serp`} className="btn btn-ghost" style={{ fontSize: '12px', padding: '6px 14px', textDecoration: 'none' }}>Open SERP Tracker</a>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function RankHistoryPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <RankHistoryInner params={params} />
    </Suspense>
  )
}
