'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type BacklinkFilter = 'all' | 'dofollow' | 'nofollow'

export default function BacklinksPage({ params }: { params: { id: string } }) {
  const [siteUrl, setSiteUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState<any>(null)
  const [backlinks, setBacklinks] = useState<any[]>([])
  const [filter, setFilter] = useState<BacklinkFilter>('all')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(50)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('sites').select('url').eq('id', params.id).single()
      if (data?.url) setSiteUrl(data.url)
    }
    load()
  }, [params.id])

  useEffect(() => {
    if (siteUrl) fetchBacklinks()
  }, [siteUrl])

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
          </div>

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 80px 80px 100px', gap: '12px', padding: '0.6rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#f8f9fb' }}>
              {['Domain / Anchor', 'DA', 'PA', 'Type', 'Spam', 'Last Seen'].map(h => (
                <div key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace' }}>{h}</div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>No backlinks match your filter.</div>
            )}

            {filtered.map((b, i) => {
              const da = daColor(b.da)
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 80px 80px 100px', gap: '12px', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', background: i % 2 === 0 ? 'transparent' : '#fafbfc' }}>
                  <div>
                    <a href={`https://${b.domain}`} target="_blank" style={{ fontSize: '13px', fontWeight: 600, color: '#1e90ff', textDecoration: 'none' }}>{b.domain}</a>
                    {b.anchor && <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '2px', fontFamily: 'Roboto Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{b.anchor}"</div>}
                  </div>
                  <div><span style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: da.bg, color: da.color }}>{b.da}</span></div>
                  <div><span style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: daColor(b.pa).bg, color: daColor(b.pa).color }}>{b.pa}</span></div>
                  <div style={{ fontSize: '12px', color: b.type === 'dofollow' ? '#00d084' : '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{b.type}</div>
                  <div style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: spamColor(b.spamScore) }}>{b.spamScore}%</div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{b.lastCrawled}</div>
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
