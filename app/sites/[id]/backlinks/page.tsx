'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type BacklinkFilter = 'all' | 'dofollow' | 'nofollow'

export default function BacklinksPage({ params }: { params: { id: string } }) {
  const [siteUrl, setSiteUrl] = useState('')
  const [bingSiteUrl, setBingSiteUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState<any>(null)
  const [backlinks, setBacklinks] = useState<any[]>([])
  const [filter, setFilter] = useState<BacklinkFilter>('all')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(50)
  const [disavows, setDisavows] = useState<any[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sites').select('url, bing_site_url').eq('id', params.id).single()
      const d = data as any
      if (d?.url) setSiteUrl(d.url)
      if (d?.bing_site_url) setBingSiteUrl(d.bing_site_url)
      loadDisavows()
    }
    load()
  }, [params.id])

  useEffect(() => {
    if (siteUrl) fetchBacklinks()
  }, [siteUrl])

  async function loadDisavows() {
    const res = await fetch(`/api/disavow?siteId=${params.id}`)
    const j = await res.json()
    setDisavows(j.entries || [])
  }

  function isDisavowed(domain: string, url: string) {
    return disavows.some(d =>
      (d.scope === 'domain' && d.target === domain) ||
      (d.scope === 'url' && d.target === url)
    )
  }

  async function addDisavow(scope: 'domain' | 'url', target: string, reason?: string) {
    await fetch('/api/disavow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: params.id, scope, target, reason }),
    })
    loadDisavows()
  }

  async function removeDisavow(id: string) {
    await fetch(`/api/disavow?id=${id}`, { method: 'DELETE' })
    loadDisavows()
  }

  async function downloadDisavowTxt() {
    window.open(`/api/disavow?siteId=${params.id}&format=txt`, '_blank')
  }

  async function syncBing() {
    if (!bingSiteUrl) { setSyncMsg('Set your Bing Webmaster site URL first (Bing Webmaster page)'); return }
    setSyncing(true); setSyncMsg('')
    try {
      const res = await fetch('/api/disavow/bing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: params.id, bingSiteUrl }),
      })
      const j = await res.json()
      setSyncMsg(j.error ? `Error: ${j.error}` : `Synced ${j.synced}/${j.total} disavows to Bing`)
      loadDisavows()
    } catch (e: any) { setSyncMsg(`Error: ${e.message}`) }
    finally { setSyncing(false) }
  }

  async function fetchBacklinks() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/backlinks?siteUrl=${encodeURIComponent(siteUrl)}&limit=${limit}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setMetrics(json.metrics)
      setBacklinks(json.backlinks)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function daColor(da: number) {
    if (da >= 70) return { bg: 'rgba(0,208,132,0.1)', color: '#00d084' }
    if (da >= 40) return { bg: 'rgba(255,165,0,0.1)', color: '#ffa500' }
    return { bg: 'rgba(255,68,68,0.1)', color: '#ff4444' }
  }

  function spamColor(score: number) {
    if (score <= 20) return '#00d084'
    if (score <= 50) return '#ffa500'
    return '#ff4444'
  }

  const filtered = backlinks
    .filter(b => filter === 'all' || b.type === filter)
    .filter(b => !search || b.domain.toLowerCase().includes(search.toLowerCase()) || b.anchor.toLowerCase().includes(search.toLowerCase()))

  const dofollowCount = backlinks.filter(b => b.type === 'dofollow').length
  const nofollowCount = backlinks.filter(b => b.type === 'nofollow').length
  const highSpamCount = backlinks.filter(b => b.spamScore > 50).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Backlinks</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Live backlink data via Moz</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={limit} onChange={e => setLimit(+e.target.value)} className="form-input" style={{ width: 'auto', fontSize: '12px' }}>
            <option value={25}>25 links</option>
            <option value={50}>50 links</option>
            <option value={100}>100 links</option>
          </select>
          <button className="btn btn-accent" onClick={fetchBacklinks} disabled={loading} style={{ fontSize: '12px' }}>
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '3rem', color: '#7a8fa8', fontSize: '13px', justifyContent: 'center' }}>
          <div style={{ width: '16px', height: '16px', border: '2px solid rgba(30,144,255,0.3)', borderTop: '2px solid #1e90ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Fetching backlink data from Moz...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {metrics && !loading && (
        <>
          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px', marginBottom: '1.5rem' }}>
            {[
              { label: 'Domain Authority', value: metrics.da, color: daColor(metrics.da).color },
              { label: 'Page Authority', value: metrics.pa, color: daColor(metrics.pa).color },
              { label: 'Linking Domains', value: metrics.linkingDomains.toLocaleString(), color: '#1e90ff' },
              { label: 'Total Backlinks', value: metrics.totalLinks.toLocaleString(), color: '#0d1b2e' },
              { label: 'Spam Score', value: metrics.spamScore + '%', color: spamColor(metrics.spamScore) },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Summary row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '1.25rem', fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>
            <span style={{ color: '#00d084' }}>● {dofollowCount} dofollow</span>
            <span>● {nofollowCount} nofollow</span>
            {highSpamCount > 0 && <span style={{ color: '#ff4444' }}>● {highSpamCount} high spam</span>}
            <span style={{ color: '#ff4444' }}>● {disavows.length} disavowed</span>
          </div>

          {/* Disavow toolbar */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Disavow</div>
            <div style={{ fontSize: '12px', color: '#7a8fa8', flex: 1, minWidth: '200px' }}>Mark toxic links to tell Google and Bing to ignore them for ranking.</div>
            <button onClick={downloadDisavowTxt} disabled={disavows.length === 0} className="btn btn-ghost" style={{ fontSize: '12px' }}>Download disavow.txt (Google)</button>
            <button onClick={syncBing} disabled={syncing || disavows.length === 0} className="btn btn-accent" style={{ fontSize: '12px' }}>{syncing ? 'Syncing...' : 'Sync to Bing'}</button>
          </div>
          {syncMsg && <div style={{ fontSize: '12px', color: syncMsg.startsWith('Error') ? '#ff4444' : '#00d084', marginBottom: '8px' }}>{syncMsg}</div>}

          {/* Controls */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search domain or anchor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '13px', color: '#0d1b2e', outline: 'none', width: '220px' }}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['all', 'dofollow', 'nofollow'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: `1px solid ${filter === f ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`, background: filter === f ? 'rgba(30,144,255,0.08)' : 'transparent', color: filter === f ? '#1e90ff' : '#7a8fa8', fontFamily: 'Open Sans, sans-serif', textTransform: 'capitalize' }}>{f}</button>
              ))}
            </div>
            <span style={{ fontSize: '12px', color: '#7a8fa8', marginLeft: 'auto', fontFamily: 'Roboto Mono, monospace' }}>{filtered.length} links</span>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 80px 80px 100px 120px', gap: '12px', padding: '0.6rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#f8f9fb' }}>
              {['Domain / Anchor', 'DA', 'PA', 'Type', 'Spam', 'Last Seen', 'Disavow'].map(h => (
                <div key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace' }}>{h}</div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>No backlinks match your filter.</div>
            )}

            {filtered.map((b, i) => {
              const da = daColor(b.da)
              const disavowed = isDisavowed(b.domain, b.url)
              const entry = disavows.find(d => (d.scope === 'domain' && d.target === b.domain) || (d.scope === 'url' && d.target === b.url))
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 80px 80px 100px 120px', gap: '12px', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', background: disavowed ? 'rgba(255,68,68,0.04)' : (i % 2 === 0 ? 'transparent' : '#fafbfc') }}>
                  <div>
                    <a href={`https://${b.domain}`} target="_blank" style={{ fontSize: '13px', fontWeight: 600, color: '#1e90ff', textDecoration: 'none' }}>{b.domain}</a>
                    {b.anchor && <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '2px', fontFamily: 'Roboto Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{b.anchor}"</div>}
                  </div>
                  <div><span style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: da.bg, color: da.color }}>{b.da}</span></div>
                  <div><span style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: daColor(b.pa).bg, color: daColor(b.pa).color }}>{b.pa}</span></div>
                  <div style={{ fontSize: '12px', color: b.type === 'dofollow' ? '#00d084' : '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{b.type}</div>
                  <div style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: spamColor(b.spamScore) }}>{b.spamScore}%</div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{b.lastCrawled}</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {disavowed ? (
                      <button onClick={() => entry && removeDisavow(entry.id)} style={{ padding: '3px 8px', fontSize: '11px', border: '1px solid #ff4444', background: 'rgba(255,68,68,0.08)', color: '#ff4444', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Roboto Mono, monospace' }}>undo</button>
                    ) : (
                      <>
                        <button onClick={() => addDisavow('domain', b.domain)} style={{ padding: '3px 8px', fontSize: '11px', border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: '#0d1b2e', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Roboto Mono, monospace' }} title="Disavow entire domain">domain</button>
                        <button onClick={() => addDisavow('url', b.url)} style={{ padding: '3px 8px', fontSize: '11px', border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: '#0d1b2e', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Roboto Mono, monospace' }} title="Disavow this URL only">url</button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {!loading && !metrics && !error && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#7a8fa8' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '4px' }}>Loading backlink data...</div>
        </div>
      )}
    </div>
  )
}
