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
  background: '#fff',
  borderRadius: '12px',
  padding: '1.5rem',
  border: '1px solid rgba(0,0,0,0.08)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
}

const planColors: Record<string, string> = {
  free: '#939393',
  starter: '#68ccd1',
  pro: '#e4b34f',
  agency: '#2367a0',
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
    return <div style={{ color: '#939393', padding: '2rem' }}>Loading dashboard...</div>
  }

  if (!stats) return null

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, color: '#2367a0' },
    { label: 'Active Users', value: stats.activeUsers, color: '#68ccd1' },
    { label: 'New (30d)', value: stats.newSignups30d, color: '#e4b34f' },
    { label: 'Total Sites', value: stats.totalSites, color: '#2367a0' },
    { label: 'Audits Run', value: stats.totalAudits, color: '#68ccd1' },
    { label: 'Keywords', value: stats.totalKeywords, color: '#e4b34f' },
  ]

  return (
    <div>
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '24px', color: '#2367a0', marginBottom: '1.5rem' }}>
        Dashboard Overview
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {statCards.map(card => (
          <div key={card.label} style={cardStyle}>
            <div style={{ fontSize: '12px', color: '#939393', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: card.color, fontFamily: 'Montserrat, sans-serif' }}>
              {card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
            Users by Plan
          </h2>
          {Object.entries(stats.planBreakdown).map(([plan, count]) => {
            const pct = stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0
            return (
              <div key={plan} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#000', textTransform: 'capitalize' }}>{plan}</span>
                  <span style={{ fontSize: '13px', color: '#939393' }}>{count} ({pct.toFixed(0)}%)</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: planColors[plan] || '#68ccd1', borderRadius: '3px' }} />
                </div>
              </div>
            )
          })}
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
            Recent Signups
          </h2>
          {stats.recentSignups.length === 0 ? (
            <div style={{ color: '#939393', fontSize: '13px' }}>No signups yet</div>
          ) : (
            stats.recentSignups.map(user => (
              <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#000' }}>{user.full_name || user.email}</div>
                  <div style={{ fontSize: '11px', color: '#939393' }}>{user.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase',
                    background: `${planColors[user.plan] || '#939393'}20`, color: planColors[user.plan] || '#939393',
                    fontWeight: 600,
                  }}>
                    {user.plan}
                  </span>
                  <span style={{ fontSize: '11px', color: '#939393' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {activities.length > 0 && (
        <div style={{ ...cardStyle, marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
            Recent Admin Activity
          </h2>
          {activities.map(a => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#2367a0', fontWeight: 600 }}>{a.action.replace(/_/g, ' ')}</span>
                {a.details?.email && <span style={{ fontSize: '13px', color: '#939393' }}> — {a.details.email}</span>}
              </div>
              <span style={{ fontSize: '11px', color: '#939393' }}>
                {new Date(a.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
