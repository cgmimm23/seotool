'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface AuditSnapshot {
  id: string
  overall_score: number
  grade: string
  categories: Record<string, number>
  created_at: string
}

export default function HealthTrendPage() {
  const params = useParams()
  const siteId = params.id as string
  const [audits, setAudits] = useState<AuditSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('audit_reports')
      .select('id, overall_score, grade, categories, created_at')
      .eq('site_id', siteId)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => { setAudits(data || []); setLoading(false) })
  }, [siteId])

  if (loading) return <div style={{ padding: '2rem', color: '#7a8fa8' }}>Loading health trend...</div>

  const latest = audits[audits.length - 1]
  const previous = audits.length >= 2 ? audits[audits.length - 2] : null
  const scoreDelta = previous ? latest.overall_score - previous.overall_score : 0
  const maxScore = Math.max(...audits.map(a => a.overall_score), 100)

  // Get all category names
  const categoryNames = latest?.categories ? Object.keys(latest.categories) : []

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Site Health Trend</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Track your SEO score changes over time</p>
      </div>

      {audits.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '3rem', color: '#7a8fa8' }}>
          No audits yet. Run your first audit to start tracking your site health.
        </div>
      ) : (
        <>
          {/* Current Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem' }}>
              <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'Roboto Mono, monospace' }}>Current Score</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: latest.overall_score >= 80 ? '#00d084' : latest.overall_score >= 50 ? '#ffa500' : '#ff4444', fontFamily: 'Montserrat, sans-serif' }}>{latest.overall_score}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem' }}>
              <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'Roboto Mono, monospace' }}>Grade</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#2367a0', fontFamily: 'Montserrat, sans-serif' }}>{latest.grade}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem' }}>
              <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'Roboto Mono, monospace' }}>Change</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: scoreDelta >= 0 ? '#00d084' : '#ff4444', fontFamily: 'Montserrat, sans-serif' }}>
                {scoreDelta >= 0 ? '+' : ''}{scoreDelta}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem' }}>
              <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'Roboto Mono, monospace' }}>Total Audits</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0d1b2e', fontFamily: 'Montserrat, sans-serif' }}>{audits.length}</div>
            </div>
          </div>

          {/* Score Chart */}
          <div style={card}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Score History</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '180px', paddingBottom: '24px', position: 'relative' }}>
              {audits.map((a, i) => {
                const height = (a.overall_score / maxScore) * 150
                const color = a.overall_score >= 80 ? '#00d084' : a.overall_score >= 50 ? '#ffa500' : '#ff4444'
                return (
                  <div key={a.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color }}>{a.overall_score}</span>
                    <div style={{ width: '100%', maxWidth: '40px', height: `${height}px`, background: color, borderRadius: '4px 4px 0 0', opacity: 0.8, minHeight: '4px' }} />
                    <span style={{ fontSize: '9px', color: '#7a8fa8', position: 'absolute', bottom: 0 }}>
                      {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Category Trends */}
          {categoryNames.length > 0 && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Category Scores (Latest)</div>
              {categoryNames.map(cat => {
                const score = latest.categories[cat] || 0
                const prevScore = previous?.categories?.[cat] || score
                const delta = score - prevScore
                return (
                  <div key={cat} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#0d1b2e' }}>{cat}</span>
                      <span style={{ fontSize: '13px' }}>
                        <span style={{ fontWeight: 700, color: score >= 80 ? '#00d084' : score >= 50 ? '#ffa500' : '#ff4444' }}>{score}</span>
                        {delta !== 0 && <span style={{ fontSize: '11px', color: delta > 0 ? '#00d084' : '#ff4444', marginLeft: '6px' }}>{delta > 0 ? '+' : ''}{delta}</span>}
                      </span>
                    </div>
                    <div style={{ height: '6px', background: '#f0f4f8', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${score}%`, background: score >= 80 ? '#00d084' : score >= 50 ? '#ffa500' : '#ff4444', borderRadius: '3px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Audit History Table */}
          <div style={card}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Audit History</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 140px', gap: '12px', padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              {['#', 'Score', 'Grade', 'Date'].map(h => (
                <div key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', fontFamily: 'Roboto Mono, monospace' }}>{h}</div>
              ))}
            </div>
            {[...audits].reverse().map((a, i) => (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 140px', gap: '12px', padding: '0.6rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '13px', color: '#7a8fa8' }}>Audit #{audits.length - i}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: a.overall_score >= 80 ? '#00d084' : a.overall_score >= 50 ? '#ffa500' : '#ff4444' }}>{a.overall_score}</div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{a.grade}</div>
                <div style={{ fontSize: '12px', color: '#7a8fa8' }}>{new Date(a.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
