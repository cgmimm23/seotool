'use client'

import { useEffect, useState } from 'react'

interface Stats {
  totalUsers: number
  activeUsers: number
  totalSites: number
  totalAudits: number
  totalKeywords: number
  newSignups30d: number
  planBreakdown: Record<string, number>
}

const cardStyle = {
  background: '#fff', borderRadius: '12px', padding: '1.5rem',
  border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
}

const planColors: Record<string, string> = {
  free: '#939393', starter: '#68ccd1', pro: '#e4b34f', agency: '#2367a0',
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false) })
  }, [])

  if (loading) return <div style={{ color: '#939393', padding: '2rem' }}>Loading statistics...</div>
  if (!stats) return null

  const metrics = [
    { label: 'Total Users', value: stats.totalUsers, color: '#2367a0' },
    { label: 'Active Users', value: stats.activeUsers, color: '#68ccd1' },
    { label: 'Suspended', value: stats.totalUsers - stats.activeUsers, color: '#ef4444' },
    { label: 'New (30 days)', value: stats.newSignups30d, color: '#e4b34f' },
    { label: 'Total Sites', value: stats.totalSites, color: '#2367a0' },
    { label: 'Total Audits', value: stats.totalAudits, color: '#68ccd1' },
    { label: 'Total Keywords', value: stats.totalKeywords, color: '#e4b34f' },
    { label: 'Avg Sites/User', value: stats.totalUsers > 0 ? (stats.totalSites / stats.totalUsers).toFixed(1) : '0', color: '#2367a0' },
  ]

  const maxPlanCount = Math.max(...Object.values(stats.planBreakdown), 1)

  return (
    <div>
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '24px', color: '#2367a0', marginBottom: '1.5rem' }}>
        Platform Statistics
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {metrics.map(m => (
          <div key={m.label} style={cardStyle}>
            <div style={{ fontSize: '11px', color: '#939393', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{m.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: m.color, fontFamily: 'Montserrat, sans-serif' }}>
              {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1.5rem', fontFamily: 'Montserrat, sans-serif' }}>
            Plan Distribution
          </h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', height: '200px', paddingBottom: '30px', position: 'relative' }}>
            {Object.entries(stats.planBreakdown).map(([plan, count]) => {
              const height = maxPlanCount > 0 ? (count / maxPlanCount) * 160 : 0
              return (
                <div key={plan} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: planColors[plan] }}>{count}</span>
                  <div style={{
                    width: '100%', height: `${height}px`, background: planColors[plan],
                    borderRadius: '6px 6px 0 0', minHeight: '4px', transition: 'height 0.3s',
                    opacity: 0.8,
                  }} />
                  <span style={{ fontSize: '11px', color: '#939393', textTransform: 'capitalize', position: 'absolute', bottom: '0' }}>
                    {plan}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1.5rem', fontFamily: 'Montserrat, sans-serif' }}>
            Engagement Metrics
          </h2>
          {[
            { label: 'Active Rate', value: stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : '0', suffix: '%', color: '#68ccd1' },
            { label: 'Avg Audits per User', value: stats.totalUsers > 0 ? (stats.totalAudits / stats.totalUsers).toFixed(1) : '0', suffix: '', color: '#e4b34f' },
            { label: 'Avg Keywords per User', value: stats.totalUsers > 0 ? (stats.totalKeywords / stats.totalUsers).toFixed(1) : '0', suffix: '', color: '#2367a0' },
            { label: 'Paid Conversion', value: stats.totalUsers > 0 ? (((stats.totalUsers - (stats.planBreakdown.free || 0)) / stats.totalUsers) * 100).toFixed(1) : '0', suffix: '%', color: '#e4b34f' },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '13px', color: '#939393' }}>{m.label}</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: m.color, fontFamily: 'Montserrat, sans-serif' }}>
                {m.value}{m.suffix}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
