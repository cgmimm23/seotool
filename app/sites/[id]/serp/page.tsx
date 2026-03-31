'use client'

import { Suspense } from 'react'
import { useState } from 'react'

function SerpPageInner() {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState('')
  const [searched, setSearched] = useState('')

  async function fetchSerp() {
    if (!keyword) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/serp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(data.results || [])
      setSearched(keyword)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>SERP Tracker</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Live Google rankings via SerpAPI</p>
      </div>
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="text" className="form-input" placeholder="Enter keyword to check..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchSerp()} style={{ flex: 1 }} />
          <button className="btn btn-accent" onClick={fetchSerp} disabled={loading}>{loading ? 'Fetching...' : 'Check SERP'}</button>
        </div>
      </div>
      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '1rem' }}>{error}</div>}
      {results.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Results for "{searched}"</div>
            <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{results.length} results</div>
          </div>
          {results.map((r: any, i: number) => (
            <div key={i} style={{ display: 'flex', gap: '12px', padding: '0.85rem 0', borderBottom: i < results.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none', alignItems: 'flex-start' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, fontFamily: 'Roboto Mono, monospace', flexShrink: 0, marginTop: '2px', color: '#4a6080' }}>{r.position || i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '3px', fontFamily: 'Roboto Mono, monospace' }}>{r.displayed_link || r.link}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e90ff', lineHeight: 1.3 }}>{r.title}</div>
                <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '4px', lineHeight: 1.5 }}>{r.snippet}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && results.length === 0 && !error && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#7a8fa8' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '4px' }}>Enter a keyword above</div>
          <div style={{ fontSize: '13px' }}>See live Google results instantly</div>
        </div>
      )}
    </div>
  )
}

export default function SerpPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <SerpPageInner />
    </Suspense>
  )
}
