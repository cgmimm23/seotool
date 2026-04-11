'use client'

import { useEffect, useState } from 'react'

interface Stats {
  totalUsers: number
  activeUsers: number
  totalSites: number
  totalAudits: number
  totalKeywords: number
  newSignups30d: number
  recentSignups: { id: string; email: string; full_name: string; plan: string; created_at: string }[]
  planBreakdown: Record<string, number>
}

interface Activity {
  id: string
  action: string
  target_user_id: string
  details: any
  created_at: string
}

const cardStyle = {
  background: '#1a2942',
  borderRadius: '12px',
  padding: '1.5rem',
  border: '1px solid rgba(255,255,255,0.06)',
}

const planColors: Record<string, string> = {
  free: '#7a8fa8',
  starter: '#1e90ff',
  pro: '#ffb400',
  agency: '#22c55e',
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/admin/activity?limit=10').then(r => r.json()),
    ]).then(([s, a]) => {
      setStats(s)
      setActivities(a.activities || [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div style={{ color: '#7a8fa8', padding: '2rem' }}>Loading dashboard...</div>
  }

  if (!stats) return null

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, color: '#1e90ff' },
    { label: 'Active Users', value: stats.activeUsers, color: '#22c55e' },
    { label: 'New (30d)', value: stats.newSignups30d, color: '#ffb400' },
    { label: 'Total Sites', value: stats.totalSites, color: '#a855f7' },
    { label: 'Audits Run', value: stats.totalAudits, color: '#f97316' },
    { label: 'Keywords', value: stats.totalKeywords, color: '#06b6d4' },
  ]

  return (
    <div>
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '24px', color: '#fff', marginBottom: '1.5rem' }}>
        Dashboard Overview
      </h1>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {statCards.map(card => (
          <div key={card.label} style={cardStyle}>
            <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: card.color, fontFamily: 'Montserrat, sans-serif' }}>
              {card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Plan Breakdown */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', color: '#fff', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
            Users by Plan
          </h2>
          {Object.entries(stats.planBreakdown).map(([plan, count]) => {
            const pct = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0
            return (
              <div key={plan} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#fff', textTransform: 'capitalize' }}>{plan}</span>
                  <span style={{ fontSize: '13px', color: '#7a8fa8' }}>{count} ({pct.toFixed(0)}%)</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: planColors[plan] || '#1e90ff', borderRadius: '3px' }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent Signups */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', color: '#fff', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
            Recent Signups
          </h2>
          {stats.recentSignups.length === 0 ? (
            <div style={{ color: '#5a6f88', fontSize: '13px' }}>No signups yet</div>
          ) : (
            stats.recentSignups.map(user => (
              <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#fff' }}>{user.full_name || user.email}</div>
                  <div style={{ fontSize: '11px', color: '#5a6f88' }}>{user.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase',
                    background: `${planColors[user.plan] || '#7a8fa8'}20`, color: planColors[user.plan] || '#7a8fa8',
                    fontWeight: 600,
                  }}>
                    {user.plan}
                  </span>
                  <span style={{ fontSize: '11px', color: '#5a6f88' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {activities.length > 0 && (
        <div style={{ ...cardStyle, marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '16px', color: '#fff', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
            Recent Admin Activity
          </h2>
          {activities.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#ffb400', fontWeight: 600 }}>{a.action.replace(/_/g, ' ')}</span>
                {a.details?.email && <span style={{ fontSize: '13px', color: '#7a8fa8' }}> — {a.details.email}</span>}
              </div>
              <span style={{ fontSize: '11px', color: '#5a6f88' }}>
                {new Date(a.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
