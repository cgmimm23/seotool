'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function SettingsPage() {
  const [serpKey, setSerpKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('serp_api_key, anthropic_api_key').eq('id', user.id).single()
      if (data?.serp_api_key) setSerpKey(data.serp_api_key)
      if (data?.anthropic_api_key) setAnthropicKey(data.anthropic_api_key)
    }
    load()
  }, [])

  async function saveKeys() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ serp_api_key: serpKey, anthropic_api_key: anthropicKey }).eq('id', user.id)
    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputStyle = { width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.55rem 0.85rem', fontSize: '14px', color: '#0d1b2e', outline: 'none', fontFamily: 'Roboto Mono, monospace' }
  const labelStyle = { fontSize: '11px', color: '#7a8fa8', marginBottom: '0.4rem', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Settings</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>API keys and account settings</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>API Keys</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>SerpAPI Key</label>
            <input type="password" style={inputStyle} placeholder="Your SerpAPI key" value={serpKey} onChange={e => setSerpKey(e.target.value)} />
            <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '4px' }}>Powers live SERP tracking. <a href="https://serpapi.com" target="_blank" style={{ color: '#1e90ff' }}>Get key →</a></div>
          </div>
          <div>
            <label style={labelStyle}>Anthropic API Key</label>
            <input type="password" style={inputStyle} placeholder="sk-ant-..." value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} />
            <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '4px' }}>Powers AI audits. <a href="https://console.anthropic.com" target="_blank" style={{ color: '#1e90ff' }}>Get key →</a></div>
          </div>
        </div>

        <button className="btn btn-accent" onClick={saveKeys} disabled={loading}>
          {saved ? '✓ Saved' : loading ? 'Saving...' : 'Save Keys'}
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.5rem' }}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem', paddingBottom: '0.6rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Plan</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
          {[
            { name: 'Free', price: '$0', cadence: 'forever', features: ['Manual scans', '1 site'] },
            { name: 'Starter', price: '$29', cadence: '/month', features: ['Weekly auto-scan', '3 sites'] },
            { name: 'Pro', price: '$79', cadence: '/month', features: ['Daily auto-scan', '5 sites', 'SERP tracking'] },
            { name: 'Agency', price: '$199', cadence: '/month', features: ['Hourly auto-scan', 'Unlimited sites', 'White-label'] },
          ].map(plan => (
            <div key={plan.name} style={{ background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{plan.name}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: '#1e90ff' }}>{plan.price}</div>
              <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '0.75rem' }}>{plan.cadence}</div>
              {plan.features.map(f => (
                <div key={f} style={{ fontSize: '12px', color: '#4a6080', marginBottom: '3px' }}>· {f}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
