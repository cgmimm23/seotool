'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function SettingsPage() {
  const [serpKey, setSerpKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState('free')
  const [cancelAt, setCancelAt] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('serp_api_key, plan, subscription_cancel_at').eq('id', user.id).single()
      if (data?.serp_api_key) setSerpKey(data.serp_api_key)
      if (data?.plan) setCurrentPlan(data.plan)
      if (data?.subscription_cancel_at) setCancelAt(data.subscription_cancel_at)
    }
    load()
  }, [])

  async function saveKeys() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ serp_api_key: serpKey }).eq('id', user.id)
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleCheckout(priceId: string, plan: string) {
    setCheckoutLoading(plan)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, plan }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setCheckoutLoading('')
  }

  async function handlePortal() {
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  const inputStyle = { width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.55rem 0.85rem', fontSize: '14px', color: '#0d1b2e', outline: 'none', fontFamily: 'Roboto Mono, monospace' }
  const labelStyle = { fontSize: '11px', color: '#7a8fa8', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }
  const cardStyle = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }

  const plans = [
    { key: 'starter', name: 'Starter', price: '$59.95', cadence: '/month', priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '', features: ['1 site', 'All AI tools', 'Daily auto-scans'] },
    { key: 'pro', name: 'Pro', price: '$149', cadence: '/month', priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '', features: ['5 sites', 'All AI tools', 'Hourly auto-scans', 'Local SEO suite'] },
    { key: 'enterprise', name: 'Enterprise', price: 'Custom', cadence: 'pricing', priceId: '', features: ['Unlimited sites', 'API access', 'Team collaboration', 'Webhooks', 'White-label reports'] },
  ]

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Settings</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Account, billing, and integrations</p>
      </div>

      {/* Current Plan & Billing */}
      <div style={cardStyle}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          Subscription
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <span style={{ fontSize: '14px', color: '#000' }}>Current plan:</span>
          <span style={{
            fontSize: '13px', padding: '4px 12px', borderRadius: '50px', fontWeight: 700,
            background: currentPlan === 'free' ? 'rgba(147,147,147,0.15)' : 'rgba(104,204,209,0.15)',
            color: currentPlan === 'free' ? '#939393' : '#68ccd1',
            textTransform: 'capitalize', fontFamily: 'Montserrat, sans-serif',
          }}>
            {currentPlan}
          </span>
          {cancelAt && (
            <span style={{ fontSize: '12px', color: '#ef4444' }}>
              Cancels on {new Date(cancelAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {currentPlan !== 'free' && (
          <button onClick={handlePortal} style={{
            padding: '0.5rem 1.25rem', background: 'transparent', border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '50px', color: '#2367a0', fontWeight: 600, cursor: 'pointer', fontSize: '13px',
          }}>
            Manage Billing
          </button>
        )}
      </div>

      {/* Plan Selection */}
      <div style={cardStyle}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          {currentPlan === 'free' ? 'Choose a Plan' : 'Change Plan'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
          {plans.map(plan => {
            const isCurrent = currentPlan === plan.key
            return (
              <div key={plan.key} style={{
                background: isCurrent ? 'rgba(104,204,209,0.05)' : '#f8f9fb',
                border: isCurrent ? '2px solid #68ccd1' : '1px solid rgba(0,0,0,0.08)',
                borderRadius: '10px', padding: '1rem',
              }}>
                <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '4px', color: '#2367a0' }}>{plan.name}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: '#2367a0' }}>{plan.price}</div>
                <div style={{ fontSize: '11px', color: '#939393', marginBottom: '0.75rem' }}>{plan.cadence}</div>
                {plan.features.map(f => (
                  <div key={f} style={{ fontSize: '12px', color: '#4a6080', marginBottom: '3px' }}>· {f}</div>
                ))}
                <div style={{ marginTop: '1rem' }}>
                  {isCurrent ? (
                    <span style={{ fontSize: '12px', color: '#68ccd1', fontWeight: 700 }}>Current Plan</span>
                  ) : plan.key === 'enterprise' ? (
                    <a href="mailto:jonathan@cgmimm.com?subject=Enterprise%20Pricing" style={{
                      display: 'block', textAlign: 'center', padding: '0.5rem', borderRadius: '50px',
                      border: '1px solid rgba(35,103,160,0.2)', color: '#2367a0', fontSize: '13px',
                      fontWeight: 700, textDecoration: 'none', fontFamily: 'Montserrat, sans-serif',
                    }}>
                      Contact Us
                    </a>
                  ) : plan.priceId ? (
                    <button
                      onClick={() => handleCheckout(plan.priceId, plan.key)}
                      disabled={!!checkoutLoading}
                      style={{
                        width: '100%', padding: '0.5rem', background: '#e4b34f', border: 'none',
                        borderRadius: '50px', color: '#fff', fontSize: '13px', fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                        opacity: checkoutLoading === plan.key ? 0.7 : 1,
                      }}
                    >
                      {checkoutLoading === plan.key ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#939393' }}>Price ID not configured</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* API Keys */}
      <div style={cardStyle}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>API Keys</div>
        <div style={{ maxWidth: '400px', marginBottom: '1rem' }}>
          <label style={labelStyle}>SerpAPI Key</label>
          <input type="password" style={inputStyle} placeholder="Your SerpAPI key" value={serpKey} onChange={e => setSerpKey(e.target.value)} />
          <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '4px' }}>Powers live SERP tracking. <a href="https://serpapi.com" target="_blank" style={{ color: '#1e90ff' }}>Get key →</a></div>
        </div>
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(30,144,255,0.05)', border: '1px solid rgba(30,144,255,0.15)', borderRadius: '8px', fontSize: '12px', color: '#4a6080', marginBottom: '1rem' }}>
          AI features are powered by a server-side Anthropic key — no setup required.
        </div>
        <button className="btn btn-accent" onClick={saveKeys} disabled={loading}>
          {saved ? '✓ Saved' : loading ? 'Saving...' : 'Save Keys'}
        </button>
      </div>

      {/* Enterprise Features */}
      <div style={cardStyle}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Enterprise Features</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
          {[
            { name: 'API Keys', href: '/dashboard/settings/api-keys', desc: 'Programmatic API access' },
            { name: 'Team', href: '/dashboard/settings/team', desc: 'Invite & manage members' },
            { name: 'Webhooks', href: '/dashboard/settings/webhooks', desc: 'Event notifications' },
            { name: 'White-Label', href: '/dashboard/settings/white-label', desc: 'Branded client reports' },
          ].map(item => (
            <a key={item.name} href={item.href} style={{ background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1rem', textDecoration: 'none', display: 'block' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px', color: '#2367a0', marginBottom: '4px' }}>{item.name}</div>
              <div style={{ fontSize: '12px', color: '#939393' }}>{item.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
