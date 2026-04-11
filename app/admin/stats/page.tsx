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
  background: '#1a2942', borderRadius: '12px', padding: '1.5rem',
  border: '1px solid rgba(255,255,255,0.06)',
}

const planColors: Record<string, string> = {
  free: '#7a8fa8', starter: '#1e90ff', pro: '#ffb400', agency: '#22c55e',
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false) })
  }, [])

  if (loading) return <div style={{ color: '#7a8fa8', padding: '2rem' }}>Loading statistics...</div>
  if (!stats) return null

  const metrics = [
    { label: 'Total Users', value: stats.totalUsers, color: '#1e90ff' },
    { label: 'Active Users', value: stats.activeUsers, color: '#22c55e' },
    { label: 'Suspended', value: stats.totalUsers - stats.activeUsers, color: '#ef4444' },
    { label: 'New (30 days)', value: stats.newSignups30d, color: '#ffb400' },
    { label: 'Total Sites', value: stats.totalSites, color: '#a855f7' },
    { label: 'Total Audits', value: stats.totalAudits, color: '#f97316' },
    { label: 'Total Keywords', value: stats.totalKeywords, color: '#06b6d4' },
    { label: 'Avg Sites/User', value: stats.totalUsers > 0 ? (stats.totalSites / stats.totalUsers).toFixed(1) : '0', color: '#ec4899' },
  ]

  // Visual bar chart for plan distribution
  const maxPlanCount = Math.max(...Object.values(stats.planBreakdown), 1)

  return (
    <div>
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '24px', color: '#fff', marginBottom: '1.5rem' }}>
        Platform Statistics
      </h1>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {metrics.map(m => (
          <div key={m.label} style={cardStyle}>
            <div style={{ fontSize: '11px', color: '#5a6f88', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{m.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: m.color, fontFamily: 'Montserrat, sans-serif' }}>
              {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Plan Distribution Bar Chart */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', color: '#fff', marginBottom: '1.5rem', fontFamily: 'Montserrat, sans-serif' }}>
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
                  <span style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'capitalize', position: 'absolute', bottom: '0' }}>
                    {plan}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Engagement Ratios */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', color: '#fff', marginBottom: '1.5rem', fontFamily: 'Montserrat, sans-serif' }}>
            Engagement Metrics
          </h2>
          {[
            { label: 'Active Rate', value: stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : '0', suffix: '%', color: '#22c55e' },
            { label: 'Avg Audits per User', value: stats.totalUsers > 0 ? (stats.totalAudits / stats.totalUsers).toFixed(1) : '0', suffix: '', color: '#f97316' },
            { label: 'Avg Keywords per User', value: stats.totalUsers > 0 ? (stats.totalKeywords / stats.totalUsers).toFixed(1) : '0', suffix: '', color: '#06b6d4' },
            { label: 'Paid Conversion', value: stats.totalUsers > 0 ? (((stats.totalUsers - (stats.planBreakdown.free || 0)) / stats.totalUsers) * 100).toFixed(1) : '0', suffix: '%', color: '#ffb400' },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '13px', color: '#7a8fa8' }}>{m.label}</span>
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
