'use client'

import { useEffect, useState } from 'react'

const cardStyle = {
  background: '#fff', borderRadius: '12px', padding: '1.5rem',
  border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
}

const planColors: Record<string, string> = {
  free: '#939393', starter: '#68ccd1', pro: '#e4b34f', enterprise: '#2367a0',
}

interface BillingData {
  activeSubscriptions: number
  mrr: number
  arr: number
  totalSubscribers: number
  recentCharges: { id: string; amount: number; currency: string; status: string; email: string; created: string }[]
  subscribers: { id: string; email: string; full_name: string; plan: string; stripe_customer_id: string; cancel_at: string | null }[]
}

export default function AdminBillingPage() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/billing').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div style={{ color: '#939393', padding: '2rem' }}>Loading billing data...</div>
  if (!data) return null

  return (
    <div>
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '24px', color: '#2367a0', marginBottom: '1.5rem' }}>
        Billing & Revenue
      </h1>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'MRR (Stripe)', value: `$${data.mrr.toFixed(2)}`, color: '#68ccd1' },
          { label: 'ARR', value: `$${data.arr.toFixed(0)}`, color: '#2367a0' },
          { label: 'Active Subscriptions', value: data.activeSubscriptions.toString(), color: '#e4b34f' },
          { label: 'Total Subscribers', value: data.totalSubscribers.toString(), color: '#2367a0' },
        ].map(card => (
          <div key={card.label} style={cardStyle}>
            <div style={{ fontSize: '11px', color: '#939393', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: card.color, fontFamily: 'Montserrat, sans-serif' }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Subscribers */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
            Active Subscribers ({data.subscribers.length})
          </h2>
          {data.subscribers.length === 0 ? (
            <p style={{ color: '#939393', fontSize: '13px' }}>No subscribers yet</p>
          ) : data.subscribers.map(sub => (
            <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#000' }}>{sub.full_name || sub.email}</div>
                <div style={{ fontSize: '11px', color: '#939393' }}>{sub.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase',
                  background: `${planColors[sub.plan] || '#939393'}20`, color: planColors[sub.plan] || '#939393', fontWeight: 600,
                }}>{sub.plan}</span>
                {sub.cancel_at && (
                  <span style={{ fontSize: '10px', color: '#ef4444' }}>Cancels {new Date(sub.cancel_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Charges */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
            Recent Charges
          </h2>
          {data.recentCharges.length === 0 ? (
            <p style={{ color: '#939393', fontSize: '13px' }}>No charges yet</p>
          ) : data.recentCharges.map(charge => (
            <div key={charge.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#000' }}>{charge.email || 'Unknown'}</div>
                <div style={{ fontSize: '11px', color: '#939393' }}>{new Date(charge.created).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#68ccd1', fontFamily: 'Montserrat, sans-serif' }}>
                  ${charge.amount.toFixed(2)}
                </span>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600,
                  background: charge.status === 'succeeded' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: charge.status === 'succeeded' ? '#22c55e' : '#ef4444',
                }}>{charge.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
