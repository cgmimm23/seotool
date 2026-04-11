'use client'

import { useEffect, useState } from 'react'

interface Financials {
  mrr: number
  arr: number
  payingUsers: number
  totalUsers: number
  conversionRate: string
  revenueByPlan: Record<string, { count: number; revenue: number }>
  subscribers: {
    id: string; email: string; full_name: string;
    plan: string; monthlyRevenue: number; since: string
  }[]
}

const cardStyle = {
  background: '#fff', borderRadius: '12px', padding: '1.5rem',
  border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
}

const planColors: Record<string, string> = {
  starter: '#68ccd1', pro: '#e4b34f', enterprise: '#2367a0',
}

export default function AdminFinancialsPage() {
  const [data, setData] = useState<Financials | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/financials').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div style={{ color: '#939393', padding: '2rem' }}>Loading financials...</div>
  if (!data) return null

  const topCards = [
    { label: 'Monthly Recurring Revenue', value: `$${data.mrr.toLocaleString()}`, color: '#68ccd1' },
    { label: 'Annual Run Rate', value: `$${data.arr.toLocaleString()}`, color: '#2367a0' },
    { label: 'Paying Users', value: data.payingUsers.toString(), color: '#e4b34f' },
    { label: 'Conversion Rate', value: `${data.conversionRate}%`, color: '#2367a0' },
  ]

  return (
    <div>
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '24px', color: '#2367a0', marginBottom: '1.5rem' }}>
        Financials
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {topCards.map(card => (
          <div key={card.label} style={cardStyle}>
            <div style={{ fontSize: '11px', color: '#939393', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: card.color, fontFamily: 'Montserrat, sans-serif' }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
            Revenue by Plan
          </h2>
          {Object.entries(data.revenueByPlan).map(([plan, info]) => (
            <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div>
                <span style={{ fontSize: '14px', color: planColors[plan], fontWeight: 600, textTransform: 'capitalize' }}>{plan}</span>
                <span style={{ fontSize: '12px', color: '#939393', marginLeft: '8px' }}>({info.count} users)</span>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#000', fontFamily: 'Montserrat, sans-serif' }}>
                ${info.revenue.toLocaleString()}/mo
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', marginTop: '4px' }}>
            <span style={{ fontSize: '14px', color: '#2367a0', fontWeight: 700 }}>Total MRR</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#68ccd1', fontFamily: 'Montserrat, sans-serif' }}>
              ${data.mrr.toLocaleString()}/mo
            </span>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
            Key Metrics
          </h2>
          {[
            { label: 'Total Users', value: data.totalUsers },
            { label: 'Free Users', value: data.revenueByPlan.free?.count || 0 },
            { label: 'Paying Users', value: data.payingUsers },
            { label: 'Avg Revenue / Paying User', value: data.payingUsers > 0 ? `$${(data.mrr / data.payingUsers).toFixed(0)}` : '$0' },
            { label: 'Avg Revenue / All Users', value: data.totalUsers > 0 ? `$${(data.mrr / data.totalUsers).toFixed(2)}` : '$0' },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '13px', color: '#939393' }}>{m.label}</span>
              <span style={{ fontSize: '14px', color: '#000', fontWeight: 600 }}>{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
          Active Subscribers ({data.subscribers.length})
        </h2>
        {data.subscribers.length === 0 ? (
          <div style={{ color: '#939393', fontSize: '13px', padding: '1rem 0' }}>No paying subscribers yet</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                {['Name', 'Email', 'Plan', 'Revenue', 'Since'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', color: '#939393', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.subscribers.map(sub => (
                <tr key={sub.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <a href={`/admin/users/${sub.id}`} style={{ color: '#2367a0', textDecoration: 'none', fontSize: '13px' }}>
                      {sub.full_name || '—'}
                    </a>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px', color: '#939393' }}>{sub.email}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase',
                      background: `${planColors[sub.plan]}20`, color: planColors[sub.plan], fontWeight: 600,
                    }}>
                      {sub.plan}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '14px', color: '#68ccd1', fontWeight: 600 }}>
                    ${sub.monthlyRevenue}/mo
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '12px', color: '#939393' }}>
                    {new Date(sub.since).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
