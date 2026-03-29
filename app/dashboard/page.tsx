'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await fetch('/api/audit')
      const data = await res.json()
      setReports(data.reports || [])
      setLoading(false)
    }
    load()
  }, [])

  const latest = reports[0]

  function scoreColor(s: number) {
    if (s >= 80) return '#00d084'
    if (s >= 60) return '#ffa500'
    return '#ff4444'
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Dashboard</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Your SEO overview</p>
        </div>
        <button className="btn btn-accent" onClick={() => router.push('/dashboard/audit')}>
          Run New Audit
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '1.5rem' }}>
        {[
          { label: 'SEO Score', value: latest ? latest.overall_score : '—', color: latest ? scoreColor(latest.overall_score) : '#7a8fa8' },
          { label: 'Grade', value: latest ? latest.grade : '—', color: '#1e90ff' },
          { label: 'Total Audits', value: reports.length, color: '#0d1b2e' },
          { label: 'Last Audit', value: latest ? new Date(latest.created_at).toLocaleDateString() : '—', color: '#0d1b2e' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{stat.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Latest report */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>Loading...</div>
      ) : latest ? (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Latest Audit</div>
              <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', fontFamily: 'Roboto Mono, monospace' }}>{latest.url}</div>
            </div>
            <button className="btn btn-ghost" style={{ fontSize: '12px' }} onClick={() => router.push('/dashboard/audit')}>View Full Report</button>
          </div>
          <p style={{ fontSize: '14px', color: '#4a6080', marginBottom: '1rem' }}>{latest.summary}</p>
          {/* Category bars */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
            {Object.entries(latest.categories || {}).map(([name, score]: any) => (
              <div key={name} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace' }}>{name}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: scoreColor(score) }}>{score}</div>
                <div style={{ height: '3px', background: '#e4eaf0', borderRadius: '2px', marginTop: '6px' }}>
                  <div style={{ width: `${score}%`, height: '100%', background: scoreColor(score), borderRadius: '2px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', color: '#4a6080', marginBottom: '0.5rem' }}>No audits yet</h3>
          <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1rem' }}>Run your first SEO audit to see your score.</p>
          <button className="btn btn-accent" onClick={() => router.push('/dashboard/audit')}>Run First Audit</button>
        </div>
      )}

      {/* Recent audits list */}
      {reports.length > 1 && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginTop: '12px' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Audit History</div>
          {reports.slice(1).map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div>
                <div style={{ fontSize: '13px', fontFamily: 'Roboto Mono, monospace', color: '#4a6080' }}>{r.url}</div>
                <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '2px' }}>{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: scoreColor(r.overall_score) }}>{r.overall_score}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
