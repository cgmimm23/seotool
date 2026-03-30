'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Dashboard() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
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

  function scoreGrade(s: number) {
    if (s >= 90) return 'Excellent'
    if (s >= 80) return 'Good'
    if (s >= 60) return 'Needs Work'
    if (s >= 40) return 'Poor'
    return 'Critical'
  }

  // Combined health score from all available data
  function getHealthScore() {
    if (!latest) return null
    const scores = [latest.overall_score]
    if (latest.categories) {
      const cats = Object.values(latest.categories) as number[]
      scores.push(...cats)
    }
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  const healthScore = getHealthScore()
  const errors = latest ? (latest.checks || []).filter((c: any) => c.status === 'fail').length : 0
  const warnings = latest ? (latest.checks || []).filter((c: any) => c.status === 'warn').length : 0
  const passing = latest ? (latest.checks || []).filter((c: any) => c.status === 'pass').length : 0

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Dashboard</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Your SEO health at a glance</p>
        </div>
        <a href="/dashboard/audit" className="btn btn-accent">Run New Audit</a>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading your data...</div>
      ) : !latest ? (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Welcome to Marketing Machine SEO</div>
          <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1.5rem' }}>Run your first audit to get your SEO health score.</p>
          <a href="/dashboard/audit" className="btn btn-accent">Run First Audit</a>
        </div>
      ) : (
        <>
          {/* Overall Health Score - Hero */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '2rem', marginBottom: '12px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '140px', height: '140px', flexShrink: 0 }}>
              <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="60" fill="none" stroke="#f0f4f8" strokeWidth="12"/>
                <circle
                  cx="70" cy="70" r="60" fill="none"
                  stroke={scoreColor(healthScore || 0)}
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 60}`}
                  strokeDashoffset={`${2 * Math.PI * 60 * (1 - (healthScore || 0) / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '38px', fontWeight: 800, fontFamily: 'Montserrat, sans-serif', color: scoreColor(healthScore || 0), lineHeight: 1 }}>{healthScore}</span>
                <span style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '4px', fontFamily: 'Roboto Mono, monospace' }}>/ 100</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Roboto Mono, monospace', marginBottom: '6px' }}>Overall SEO Health Score</div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '28px', fontWeight: 800, color: scoreColor(healthScore || 0), marginBottom: '8px' }}>{scoreGrade(healthScore || 0)}</div>
              <div style={{ fontSize: '14px', color: '#4a6080', marginBottom: '1rem' }}>{latest.summary}</div>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '13px' }}>
                <span style={{ color: '#ff4444', fontWeight: 600 }}>{errors} errors</span>
                <span style={{ color: '#ffa500', fontWeight: 600 }}>{warnings} warnings</span>
                <span style={{ color: '#00d084', fontWeight: 600 }}>{passing} passing</span>
              </div>
              <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '8px', fontFamily: 'Roboto Mono, monospace' }}>
                Last audit: {new Date(latest.created_at).toLocaleDateString()} - {latest.url}
              </div>
            </div>
          </div>

          {/* Category scores */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px', marginBottom: '12px' }}>
            {Object.entries(latest.categories || {}).map(([name, score]: any) => (
              <div key={name} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '6px', fontFamily: 'Roboto Mono, monospace' }}>{name}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: scoreColor(score) }}>{score}</div>
                <div style={{ height: '3px', background: '#e4eaf0', borderRadius: '2px', marginTop: '8px' }}>
                  <div style={{ width: `${score}%`, height: '100%', background: scoreColor(score), borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
            {[
              { label: 'Audit Score', value: latest.overall_score, color: scoreColor(latest.overall_score) },
              { label: 'Grade', value: latest.grade, color: '#1e90ff' },
              { label: 'Total Audits', value: reports.length, color: '#0d1b2e' },
              { label: 'Last Audit', value: new Date(latest.created_at).toLocaleDateString(), color: '#0d1b2e' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color, lineHeight: 1.2 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Top issues */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Top Issues</div>
                <a href="/dashboard/audit" style={{ fontSize: '12px', color: '#1e90ff', textDecoration: 'none' }}>View all</a>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {(latest.checks || []).filter((c: any) => c.status === 'fail').slice(0, 4).map((c: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', borderLeft: '2px solid #ff4444', background: '#f8f9fb' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(255,68,68,0.1)', color: '#ff4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>X</div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#0d1b2e' }}>{c.title}</div>
                      <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '1px' }}>{c.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Audit History</div>
              {reports.slice(0, 5).map((r: any, i: number) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: i < Math.min(reports.length, 5) - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: '#4a6080' }}>{r.url?.replace(/^https?:\/\//, '').substring(0, 30)}</div>
                    <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '1px' }}>{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: scoreColor(r.overall_score) }}>{r.overall_score}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
