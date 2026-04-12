'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function BrandMonitorPage() {
  const params = useParams()
  const [brandName, setBrandName] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('sites').select('name').eq('id', params.id).single().then(({ data }) => {
      if (data?.name) setBrandName(data.name)
    })
  }, [params.id])

  async function monitor() {
    if (!brandName) return
    setLoading(true)
    const res = await fetch('/api/brand-monitor', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName }),
    })
    setData(await res.json())
    setLoading(false)
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const inputStyle = { width: '100%', padding: '0.6rem 0.85rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Brand Monitoring</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Track mentions of your brand across the web</p>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your brand name" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={monitor} disabled={loading || !brandName} className="btn btn-accent" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
            {loading ? 'Searching...' : 'Find Mentions'}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '12px' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1.1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e90ff', fontFamily: 'Montserrat, sans-serif' }}>{data.totalMentions}</div>
              <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', marginTop: '4px' }}>Total Mentions</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1.1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#00d084', fontFamily: 'Montserrat, sans-serif' }}>{data.mentions?.filter((m: any) => m.type === 'news').length || 0}</div>
              <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', marginTop: '4px' }}>News Mentions</div>
            </div>
          </div>

          {data.analysis && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: '#2367a0' }}>AI Sentiment Analysis</div>
              <div style={{ fontSize: '14px', color: '#4a6080', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{data.analysis}</div>
            </div>
          )}

          {data.mentions?.length > 0 && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Mentions</div>
              {data.mentions.map((m: any, i: number) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < data.mentions.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <a href={m.url} target="_blank" style={{ fontSize: '13px', fontWeight: 600, color: '#1e90ff', textDecoration: 'none' }}>{m.title}</a>
                    {m.type === 'news' && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0,208,132,0.1)', color: '#00d084', fontWeight: 600 }}>News</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '2px' }}>{m.domain} {m.date ? `• ${m.date}` : ''}</div>
                  {m.snippet && <div style={{ fontSize: '12px', color: '#4a6080', marginTop: '4px' }}>{m.snippet}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
