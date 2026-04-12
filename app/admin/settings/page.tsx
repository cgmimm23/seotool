'use client'

import { useEffect, useState } from 'react'

const cardStyle = {
  background: '#fff', borderRadius: '12px', padding: '1.5rem',
  border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  marginBottom: '1rem',
}

const inputStyle = {
  width: '100%', padding: '0.5rem 0.75rem', background: '#f8f9fb',
  border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px',
  color: '#000', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'Roboto Mono, monospace',
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      setSettings(d.settings || {})
      setLoading(false)
    })
  }, [])

  async function save(key: string) {
    setSaving(key)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: settings[key] || '' }),
    })
    setSaving('')
    setSaved(key)
    setTimeout(() => setSaved(''), 3000)
  }

  function field(key: string, label: string, placeholder: string, description: string) {
    return (
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px', fontWeight: 600 }}>{label}</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={settings[key] || ''}
            onChange={e => setSettings({ ...settings, [key]: e.target.value })}
            placeholder={placeholder}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={() => save(key)} disabled={saving === key} style={{
            padding: '0.5rem 1rem', background: '#e4b34f', border: 'none',
            borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer',
            fontSize: '12px', whiteSpace: 'nowrap', opacity: saving === key ? 0.7 : 1,
          }}>
            {saving === key ? 'Saving...' : saved === key ? 'Saved!' : 'Save'}
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#939393', marginTop: '4px' }}>{description}</div>
      </div>
    )
  }

  if (loading) return <div style={{ color: '#939393', padding: '2rem' }}>Loading settings...</div>

  return (
    <div>
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '24px', color: '#2367a0', marginBottom: '1.5rem' }}>
        Platform Settings
      </h1>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>Analytics & Tracking</h2>
        {field('ga_measurement_id', 'Google Analytics Measurement ID', 'G-XXXXXXXXXX', 'Google Analytics 4 measurement ID. Added to all public pages (landing, learn, terms, privacy).')}
        {field('gtm_id', 'Google Tag Manager ID', 'GTM-XXXXXXX', 'Optional. Google Tag Manager container ID for advanced tracking.')}
        {field('fb_pixel_id', 'Facebook Pixel ID', '1234567890', 'Optional. Facebook/Meta pixel for ad tracking.')}
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>SEO & Social</h2>
        {field('default_og_image', 'Default Open Graph Image URL', 'https://seo.cgmimm.com/og-image.png', 'Default social sharing image for pages without a specific image.')}
        {field('twitter_handle', 'Twitter/X Handle', '@cgmimm', 'Used in Twitter card meta tags.')}
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>Integrations</h2>
        {field('intercom_app_id', 'Intercom App ID', 'abc123', 'Optional. Intercom live chat widget on customer dashboard.')}
        {field('custom_head_script', 'Custom Head Script', '<script>...</script>', 'Raw HTML/script injected into the <head> of all pages. Use for any third-party tracking.')}
      </div>

      <ChangePasswordCard />
    </div>
  )
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)

    if (next !== confirm) return setMsg({ type: 'error', text: 'New passwords do not match' })
    if (next.length < 8) return setMsg({ type: 'error', text: 'New password must be at least 8 characters' })

    setLoading(true)
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) return setMsg({ type: 'error', text: data.error || 'Failed to change password' })

    setMsg({ type: 'success', text: 'Password changed successfully' })
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  const input = {
    width: '100%', padding: '0.5rem 0.75rem', background: '#f8f9fb',
    border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px',
    color: '#000', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>Change Admin Password</h2>

      <form onSubmit={submit}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px', fontWeight: 600 }}>Current Password</label>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required style={input} />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px', fontWeight: 600 }}>New Password</label>
          <input type="password" value={next} onChange={e => setNext(e.target.value)} required minLength={8} placeholder="At least 8 characters" style={input} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px', fontWeight: 600 }}>Confirm New Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={input} />
        </div>

        {msg && (
          <p style={{ fontSize: '13px', color: msg.type === 'error' ? '#ff4444' : '#00d084', marginBottom: '0.75rem' }}>{msg.text}</p>
        )}

        <button type="submit" disabled={loading || !current || !next || !confirm} style={{
          padding: '0.5rem 1.25rem', background: '#e4b34f', border: 'none',
          borderRadius: '50px', color: '#fff', fontWeight: 700, cursor: 'pointer',
          fontSize: '13px', fontFamily: 'Montserrat, sans-serif',
          opacity: loading || !current || !next || !confirm ? 0.7 : 1,
        }}>
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  )
}
