'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const diffColors: Record<string, string> = { easy: '#00d084', medium: '#ffa500', hard: '#ff4444' }
const typeLabels: Record<string, string> = { guest_post: 'Guest Post', resource_page: 'Resource Page', directory: 'Directory', partnership: 'Partnership', broken_link: 'Broken Link', skyscraper: 'Skyscraper' }

export default function LinkBuildingPage() {
  const params = useParams()
  const [siteUrl, setSiteUrl] = useState('')
  const [niche, setNiche] = useState('')
  const [loading, setLoading] = useState(false)
  const [prospects, setProspects] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('sites').select('url').eq('id', params.id).single().then(({ data }) => {
      if (data) setSiteUrl(data.url)
    })
  }, [params.id])

  async function findProspects() {
    setLoading(true)
    const res = await fetch('/api/link-prospects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteUrl, niche }),
    })
    const data = await res.json()
    setProspects(data.prospects || [])
    setLoading(false)
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const inputStyle = { padding: '0.6rem 0.85rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Link Building Prospects</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>AI finds websites likely to link to you based on your niche</p>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#7a8fa8', marginBottom: '4px' }}>Your Niche/Industry</label>
            <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. SaaS, real estate, fitness" style={{ ...inputStyle, width: '100%' }} />
          </div>
          <button onClick={findProspects} disabled={loading} className="btn btn-accent" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
            {loading ? 'Finding...' : 'Find Prospects'}
          </button>
        </div>
      </div>

      {prospects.length > 0 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Link Building Opportunities ({prospects.length})</div>
          {prospects.map((p, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: i < prospects.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e90ff' }}>{p.domain}</div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(30,144,255,0.1)', color: '#1e90ff', fontWeight: 600 }}>{typeLabels[p.type] || p.type}</span>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: `${diffColors[p.difficulty] || '#7a8fa8'}15`, color: diffColors[p.difficulty] || '#7a8fa8', fontWeight: 600, textTransform: 'capitalize' }}>{p.difficulty}</span>
                  <span style={{ fontSize: '11px', color: '#ffa500', fontFamily: 'Roboto Mono, monospace' }}>DA {p.estimated_da}</span>
                </div>
              </div>
              <div style={{ fontSize: '13px', color: '#4a6080', marginBottom: '4px' }}>{p.why}</div>
              <div style={{ fontSize: '12px', color: '#7a8fa8' }}><strong>Approach:</strong> {p.approach}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
