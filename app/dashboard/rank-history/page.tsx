'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type SourcePositions = {
  gsc: number | null
  bing: number | null
  serp: number | null
}

type KeywordRow = {
  keyword: string
  positions: Record<string, SourcePositions>
}

type RankData = {
  dates: string[]
  rows: KeywordRow[]
}

const DAYS_OPTIONS = [7, 14, 30, 60, 90]

function positionColor(pos: number | null): string {
  if (pos === null) return 'transparent'
  if (pos <= 3) return 'rgba(34,197,94,0.25)'
  if (pos <= 10) return 'rgba(59,130,246,0.2)'
  if (pos <= 20) return 'rgba(234,179,8,0.2)'
  return 'rgba(239,68,68,0.15)'
}

function positionTextColor(pos: number | null): string {
  if (pos === null) return 'rgba(255,255,255,0.2)'
  if (pos <= 3) return '#4ade80'
  if (pos <= 10) return '#60a5fa'
  if (pos <= 20) return '#facc15'
  return '#f87171'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function RankHistoryInner() {
  const searchParams = useSearchParams()
  const siteParam = searchParams.get('site') || ''

  const [siteId, setSiteId] = useState<string | null>(null)
  const [siteName, setSiteName] = useState<string>('')
  const [days, setDays] = useState(30)
  const [data, setData] = useState<RankData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const tableRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    async function resolveSite() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const decodedUrl = decodeURIComponent(siteParam)
      const { data: site } = await supabase
        .from('sites')
        .select('id, name')
        .eq('url', decodedUrl)
        .eq('user_id', session.user.id)
        .single()
      if (site) {
        setSiteId(site.id)
        setSiteName(site.name)
      }
    }
    if (siteParam) resolveSite()
  }, [siteParam])

  useEffect(() => {
    if (!siteId) return
    fetchData()
  }, [siteId, days])

  async function fetchData() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/rank-history?siteId=${siteId}&days=${days}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (e: any) {
      setError(e.message || 'Failed to load rank history')
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = data?.rows.filter(r =>
    r.keyword.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#e2e8f0', minHeight: '100vh' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '11px', color: '#4a6080', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace' }}>
          {siteName || decodeURIComponent(siteParam)}
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0, fontFamily: 'Montserrat, sans-serif' }}>
          Rank History
        </h1>
        <p style={{ fontSize: '13px', color: '#7a8fa8', margin: '4px 0 0', fontFamily: 'Roboto Mono, monospace' }}>
          Keyword positions over time across GSC, Bing, and SERP
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Filter keywords..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: '#0d1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '13px', color: '#e2e8f0', outline: 'none', width: '220px' }}
        />
        <div style={{ display: 'flex', gap: '6px' }}>
          {DAYS_OPTIONS.map(d => (
            <button key={d} onClick={() => setDays(d)} style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '12px', fontWeight: days === d ? 700 : 400, border: days === d ? '1px solid #1e90ff' : '1px solid rgba(255,255,255,0.1)', background: days === d ? 'rgba(30,144,255,0.2)' : '#0d1b2e', color: days === d ? '#60a5fa' : 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              {d}d
            </button>
          ))}
        </div>
        <button onClick={fetchData} style={{ padding: '0.4rem 1rem', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)', background: '#0d1b2e', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginLeft: 'auto' }}>
          ↻ Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '1rem', fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>
        <span style={{ color: '#4ade80' }}>■ 1–3</span>
        <span style={{ color: '#60a5fa' }}>■ 4–10</span>
        <span style={{ color: '#facc15' }}>■ 11–20</span>
        <span style={{ color: '#f87171' }}>■ 21+</span>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>— no data</span>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '13px', color: '#f87171', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '2rem', color: '#7a8fa8', fontSize: '13px' }}>
          <div style={{ width: '16px', height: '16px', border: '2px solid rgba(30,144,255,0.3)', borderTop: '2px solid #1e90ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Loading rank history...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {!loading && !error && data && data.rows.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '14px' }}>
          No rank history found for this site in the last {days} days.<br />
          <span style={{ fontSize: '12px', opacity: 0.6 }}>Run SERP checks from the SERP Tracker page to start tracking.</span>
        </div>
      )}

      {!loading && data && data.dates.length > 0 && filteredRows.length > 0 && (
        <div ref={tableRef} style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)', background: '#0d1b2e' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${220 + data.dates.length * 105}px` }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ position: 'sticky', left: 0, background: '#0a1628', zIndex: 10, padding: '0.75rem 1rem', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', minWidth: '220px', fontFamily: 'Roboto Mono, monospace' }}>
                  Keyword
                </th>
                {data.dates.map(date => (
                  <th key={date} colSpan={3} style={{ padding: '0.5rem 0.25rem 0.25rem', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap', fontFamily: 'Roboto Mono, monospace' }}>
                    {formatDate(date)}
                  </th>
                ))}
              </tr>
              <tr>
                {data.dates.map(date => (
                  ['GSC', 'Bing', 'SERP'].map((src, si) => (
                    <th key={`${date}-${src}`} style={{ padding: '0.25rem 0.4rem 0.5rem', textAlign: 'center', fontSize: '9px', fontWeight: 500, color: src === 'GSC' ? '#4ade80' : src === 'Bing' ? '#60a5fa' : '#c084fc', borderBottom: '1px solid rgba(255,255,255,0.08)', borderLeft: si === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace', width: '35px' }}>
                      {src}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, ri) => (
                <tr key={row.keyword} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ position: 'sticky', left: 0, background: ri % 2 === 0 ? '#0d1b2e' : '#0e1e32', zIndex: 5, padding: '0.5rem 1rem', fontSize: '13px', color: '#e2e8f0', borderRight: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }} title={row.keyword}>
                    {row.keyword}
                  </td>
                  {data.dates.map((date) => {
                    const pos = row.positions[date] || { gsc: null, bing: null, serp: null }
                    return (['gsc', 'bing', 'serp'] as const).map((src, si) => {
                      const val = pos[src]
                      return (
                        <td key={`${date}-${src}`} style={{ padding: '0.5rem 0.25rem', textAlign: 'center', fontSize: '12px', fontWeight: val !== null ? 600 : 400, color: positionTextColor(val), background: positionColor(val), borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: si === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontFamily: 'Roboto Mono, monospace', width: '35px' }}>
                          {val !== null ? val : '—'}
                        </td>
                      )
                    })
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && data && data.rows.length > 0 && filteredRows.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>
          No keywords match "{search}"
        </div>
      )}

      {!loading && data && data.rows.length > 0 && (
        <div style={{ marginTop: '1rem', fontSize: '11px', color: '#4a6080', fontFamily: 'Roboto Mono, monospace' }}>
          {filteredRows.length} keyword{filteredRows.length !== 1 ? 's' : ''} · {data.dates.length} date{data.dates.length !== 1 ? 's' : ''} · last {days} days
        </div>
      )}
    </div>
  )
}

export default function RankHistoryPage() {
  return (
    <Suspense fallback={<div style={{ color: '#7a8fa8', padding: '2rem' }}>Loading...</div>}>
      <RankHistoryInner />
    </Suspense>
  )
}
