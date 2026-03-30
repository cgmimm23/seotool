'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface RankEntry {
  keyword: string
  position: number
  url: string
  checked_at: string
}

interface KeywordHistory {
  keyword: string
  history: RankEntry[]
  current: number | null
  previous: number | null
  change: number | null
  best: number | null
  avg: number | null
}

export default function RankHistoryPage() {
  const [keywords, setKeywords] = useState<KeywordHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [checkingKeyword, setCheckingKeyword] = useState<string | null>(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [days, setDays] = useState(30)
  const supabase = createClient()

  useEffect(() => { loadHistory() }, [days])

  async function loadHistory() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data } = await supabase
      .from('serp_rankings')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('checked_at', since.toISOString())
      .order('checked_at', { ascending: true })

    if (!data) { setLoading(false); return }

    // Group by keyword
    const grouped: Record<string, RankEntry[]> = {}
    data.forEach((row: any) => {
      if (!grouped[row.keyword]) grouped[row.keyword] = []
      grouped[row.keyword].push({
        keyword: row.keyword,
        position: row.position,
        url: row.url || '',
        checked_at: row.checked_at,
      })
    })

    const histories: KeywordHistory[] = Object.entries(grouped).map(([keyword, history]) => {
      const sorted = history.sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime())
      const current = sorted[sorted.length - 1]?.position || null
      const previous = sorted.length > 1 ? sorted[sorted.length - 2]?.position || null : null
      const change = current && previous ? previous - current : null // positive = improvement
      const best = Math.min(...sorted.map(h => h.position))
      const avg = Math.round(sorted.reduce((a, h) => a + h.position, 0) / sorted.length)
      return { keyword, history: sorted, current, previous, change, best, avg }
    })

    setKeywords(histories.sort((a, b) => (a.current || 999) - (b.current || 999)))
    if (histories.length > 0 && !selected) setSelected(histories[0].keyword)
    setLoading(false)
  }

  async function checkRank(keyword: string) {
    const serpKey = localStorage.getItem('riq_serp_key')
    if (!serpKey) { alert('Add your SerpAPI key in Settings first'); return }

    setCheckingKeyword(keyword)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const params = new URLSearchParams({ q: keyword, api_key: serpKey, engine: 'google', num: '20' })
      const res = await fetch(`https://serpapi.com/search.json?${params}`)
      const data = await res.json()
      const organic = data.organic_results || []
      const position = organic.findIndex((_: any, i: number) => i + 1) + 1 || 100

      await supabase.from('serp_rankings').insert({
        user_id: session.user.id,
        keyword,
        position,
        url: organic[0]?.link || '',
        checked_at: new Date().toISOString(),
      })

      loadHistory()
    } catch (err: any) { alert('Error: ' + err.message) }
    finally { setCheckingKeyword(null) }
  }

  async function addKeyword() {
    if (!newKeyword) return
    const serpKey = localStorage.getItem('riq_serp_key')
    if (!serpKey) { alert('Add your SerpAPI key in Settings first'); return }

    setAdding(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const params = new URLSearchParams({ q: newKeyword, api_key: serpKey, engine: 'google', num: '20' })
      const res = await fetch(`https://serpapi.com/search.json?${params}`)
      const data = await res.json()
      const organic = data.organic_results || []

      let position = 100
      if (newUrl) {
        const domain = newUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
        const idx = organic.findIndex((r: any) => (r.link || '').replace(/^https?:\/\//, '').replace(/^www\./, '').startsWith(domain))
        position = idx >= 0 ? idx + 1 : 100
      } else {
        position = organic.length > 0 ? 1 : 100
      }

      await supabase.from('serp_rankings').insert({
        user_id: session.user.id,
        keyword: newKeyword,
        position,
        url: newUrl || organic[0]?.link || '',
        checked_at: new Date().toISOString(),
      })

      setNewKeyword('')
      setNewUrl('')
      loadHistory()
    } catch (err: any) { alert('Error: ' + err.message) }
    finally { setAdding(false) }
  }

  function changeColor(change: number | null) {
    if (change === null) return '#7a8fa8'
    if (change > 0) return '#00d084'
    if (change < 0) return '#ff4444'
    return '#7a8fa8'
  }

  function changeLabel(change: number | null) {
    if (change === null) return '-'
    if (change > 0) return `+${change}`
    if (change < 0) return `${change}`
    return '0'
  }

  function posColor(pos: number | null) {
    if (!pos) return '#7a8fa8'
    if (pos <= 3) return '#00d084'
    if (pos <= 10) return '#ffa500'
    return '#ff4444'
  }

  const selectedKw = keywords.find(k => k.keyword === selected)
  const avgPosition = keywords.length ? Math.round(keywords.reduce((a, k) => a + (k.current || 0), 0) / keywords.length) : 0
  const improved = keywords.filter(k => k.change && k.change > 0).length
  const dropped = keywords.filter(k => k.change && k.change < 0).length

  // Build chart data for selected keyword
  function buildChart(history: RankEntry[]) {
    if (!history.length) return null
    const maxPos = Math.max(...history.map(h => h.position), 20)
    const minPos = Math.max(1, Math.min(...history.map(h => h.position)) - 3)
    const range = maxPos - minPos

    const points = history.map((h, i) => {
      const x = history.length === 1 ? 50 : (i / (history.length - 1)) * 100
      const y = range === 0 ? 50 : ((h.position - minPos) / range) * 80 + 10
      return { x, y: 100 - y, pos: h.position, date: h.checked_at }
    })

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    return { points, pathD, minPos, maxPos }
  }

  const chart = selectedKw ? buildChart(selectedKw.history) : null
  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Rank History</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Track keyword position trends over time</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={days} onChange={e => setDays(+e.target.value)} className="form-input" style={{ width: 'auto' }}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={loadHistory} className="btn btn-ghost" style={{ fontSize: '12px' }}>Refresh</button>
        </div>
      </div>

      {/* Add keyword */}
      <div style={card}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Track New Keyword</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
          <input type="text" className="form-input" placeholder="Keyword to track" value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKeyword()} />
          <input type="text" className="form-input" placeholder="Your domain (optional)" value={newUrl} onChange={e => setNewUrl(e.target.value)} />
          <button className="btn btn-accent" onClick={addKeyword} disabled={adding || !newKeyword} style={{ whiteSpace: 'nowrap' }}>
            {adding ? 'Checking...' : 'Track Keyword'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading rank history...</div>
      ) : keywords.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>No keywords tracked yet</div>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Add keywords above to start tracking position over time.</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'Keywords Tracked', value: keywords.length, color: '#0d1b2e' },
              { label: 'Avg Position', value: '#' + avgPosition, color: posColor(avgPosition) },
              { label: 'Improved', value: improved, color: '#00d084' },
              { label: 'Dropped', value: dropped, color: dropped > 0 ? '#ff4444' : '#7a8fa8' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '12px', alignItems: 'start' }}>
            {/* Keywords list */}
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '1rem' }}>All Keywords</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {keywords.map(kw => (
                  <div
                    key={kw.keyword}
                    onClick={() => setSelected(kw.keyword)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: selected === kw.keyword ? 'rgba(30,144,255,0.06)' : '#f8f9fb', border: `1px solid ${selected === kw.keyword ? 'rgba(30,144,255,0.2)' : 'rgba(0,0,0,0.05)'}` }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kw.keyword}</div>
                      <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', marginTop: '2px' }}>
                        {kw.history.length} data point{kw.history.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {kw.change !== null && kw.change !== 0 && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: changeColor(kw.change), fontFamily: 'Roboto Mono, monospace' }}>
                          {changeLabel(kw.change)}
                        </span>
                      )}
                      <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'Montserrat, sans-serif', color: posColor(kw.current), minWidth: '28px', textAlign: 'right' }}>
                        {kw.current ? '#' + kw.current : '-'}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); checkRank(kw.keyword) }}
                        disabled={checkingKeyword === kw.keyword}
                        style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(30,144,255,0.3)', background: 'rgba(30,144,255,0.05)', color: '#1e90ff', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif', whiteSpace: 'nowrap' }}
                      >
                        {checkingKeyword === kw.keyword ? '...' : 'Check'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart panel */}
            {selectedKw && (
              <div>
                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700 }}>{selectedKw.keyword}</div>
                      <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', fontFamily: 'Roboto Mono, monospace' }}>{selectedKw.history.length} checks over {days} days</div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      {[
                        { label: 'Current', value: selectedKw.current ? '#' + selectedKw.current : '-', color: posColor(selectedKw.current) },
                        { label: 'Best', value: selectedKw.best ? '#' + selectedKw.best : '-', color: '#00d084' },
                        { label: 'Avg', value: selectedKw.avg ? '#' + selectedKw.avg : '-', color: '#7a8fa8' },
                        { label: 'Change', value: changeLabel(selectedKw.change), color: changeColor(selectedKw.change) },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase', marginBottom: '2px' }}>{s.label}</div>
                          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Line chart */}
                  {chart && (
                    <div style={{ position: 'relative' }}>
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '180px', display: 'block' }}>
                        {/* Grid lines */}
                        {[10, 3, 1].map(pos => {
                          if (chart.minPos > pos || chart.maxPos < pos) return null
                          const y = 100 - (((pos - chart.minPos) / (chart.maxPos - chart.minPos)) * 80 + 10)
                          return (
                            <g key={pos}>
                              <line x1="0" y1={y} x2="100" y2={y} stroke="rgba(0,0,0,0.05)" strokeWidth="0.5" />
                            </g>
                          )
                        })}
                        {/* Area fill */}
                        <path
                          d={`${chart.pathD} L 100 100 L 0 100 Z`}
                          fill="rgba(30,144,255,0.06)"
                        />
                        {/* Line */}
                        <path
                          d={chart.pathD}
                          fill="none"
                          stroke="#1e90ff"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                        {/* Data points */}
                        {chart.points.map((p, i) => (
                          <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r="1.5"
                            fill="#fff"
                            stroke="#1e90ff"
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                      </svg>
                      {/* Y axis labels */}
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', padding: '8px 0' }}>
                        <span style={{ fontSize: '9px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>#{chart.minPos}</span>
                        <span style={{ fontSize: '9px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>#{Math.round((chart.minPos + chart.maxPos) / 2)}</span>
                        <span style={{ fontSize: '9px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>#{chart.maxPos}</span>
                      </div>
                    </div>
                  )}

                  {selectedKw.history.length < 2 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#7a8fa8', fontSize: '13px' }}>
                      Check this keyword again tomorrow to start seeing the trend line
                    </div>
                  )}
                </div>

                {/* History table */}
                <div style={card}>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '1rem' }}>Position History</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Date', 'Position', 'Change', 'URL'].map(h => <th key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', fontWeight: 400, padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: 'left', fontFamily: 'Roboto Mono, monospace' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {[...selectedKw.history].reverse().map((h, i, arr) => {
                        const prev = arr[i + 1]
                        const chg = prev ? prev.position - h.position : null
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                            <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: '#7a8fa8' }}>{new Date(h.checked_at).toLocaleDateString()}</td>
                            <td style={{ padding: '0.55rem 0.5rem', fontSize: '14px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: posColor(h.position) }}>#{h.position}</td>
                            <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', fontWeight: 600, fontFamily: 'Roboto Mono, monospace', color: changeColor(chg) }}>{chg !== null ? changeLabel(chg) : '-'}</td>
                            <td style={{ padding: '0.55rem 0.5rem', fontSize: '11px', fontFamily: 'Roboto Mono, monospace', color: '#7a8fa8', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.url?.replace(/^https?:\/\//, '') || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
