'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function SettingsPage() {
  const [currentPlan, setCurrentPlan] = useState('free')
  const [cancelAt, setCancelAt] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState('')
  const [annual, setAnnual] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('plan, subscription_cancel_at, email, full_name').eq('id', user.id).single()
      if (data?.plan) setCurrentPlan(data.plan)
      if (data?.subscription_cancel_at) setCancelAt(data.subscription_cancel_at)
      if (data?.email) setEmail(data.email)
      if (data?.full_name) setFullName(data.full_name)
    }
    load()
  }, [])

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

  const cardStyle = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }

  const plans = [
    {
      key: 'starter', name: 'Starter',
      price: annual ? '$599.50' : '$59.95',
      cadence: annual ? '/year' : '/month',
      savings: annual ? 'Save $119.90 (2 months free)' : '',
      priceId: annual ? (process.env.NEXT_PUBLIC_STRIPE_STARTER_ANNUAL_PRICE_ID || '') : (process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || ''),
      features: ['1 site', 'All AI tools', 'Daily auto-scans'],
    },
    {
      key: 'pro', name: 'Pro',
      price: annual ? '$1,490' : '$149',
      cadence: annual ? '/year' : '/month',
      savings: annual ? 'Save $298 (2 months free)' : '',
      priceId: annual ? (process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || '') : (process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || ''),
      features: ['5 sites', 'All AI tools', 'Hourly auto-scans', 'Local SEO suite'],
    },
    { key: 'enterprise', name: 'Enterprise', price: 'Custom', cadence: 'pricing', savings: '', priceId: '', features: ['Unlimited sites', 'API access', 'Team collaboration', 'Webhooks', 'White-label reports'] },
  ]

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Settings</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Manage your account and subscription</p>
      </div>

      {/* Account Info */}
      <div style={cardStyle}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Account</div>
        <div style={{ fontSize: '14px', color: '#000', marginBottom: '4px' }}>{fullName || 'No name set'}</div>
        <div style={{ fontSize: '13px', color: '#939393' }}>{email}</div>
      </div>

      {/* Subscription */}
      <div style={cardStyle}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Subscription</div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>
            {currentPlan === 'free' ? 'Choose a Plan' : 'Change Plan'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ color: !annual ? '#2367a0' : '#939393', fontWeight: !annual ? 600 : 400 }}>Monthly</span>
            <button onClick={() => setAnnual(!annual)} style={{
              width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: annual ? '#68ccd1' : '#e4eaf0', position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '3px', transition: 'left 0.2s',
                left: annual ? '23px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
            <span style={{ color: annual ? '#2367a0' : '#939393', fontWeight: annual ? 600 : 400 }}>Annual</span>
            {annual && <span style={{ fontSize: '11px', color: '#68ccd1', fontWeight: 700 }}>Save 2 months!</span>}
          </div>
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
                    <span style={{ fontSize: '12px', color: '#939393' }}>Coming soon</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
