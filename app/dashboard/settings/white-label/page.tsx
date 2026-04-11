'use client'

import { useEffect, useState } from 'react'

const cardStyle = { background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.08)' }
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', color: '#000', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }
const btnStyle = { padding: '0.5rem 1.25rem', background: '#e4b34f', border: 'none', borderRadius: '50px', color: '#fff', fontWeight: 700 as const, cursor: 'pointer', fontSize: '13px', fontFamily: 'Montserrat, sans-serif' }

export default function WhiteLabelPage() {
  const [settings, setSettings] = useState({ company_name: '', logo_url: '', primary_color: '#2367a0', secondary_color: '#68ccd1', footer_text: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/white-label').then(r => {
      if (r.status === 403) { setError('Enterprise plan required'); setLoading(false); return null }
      return r.json()
    }).then(data => {
      if (data?.settings) setSettings(data.settings)
      setLoading(false)
    })
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/white-label', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (error === 'Enterprise plan required') {
    return (
      <div style={cardStyle}>
        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginBottom: '0.5rem' }}>White-Label Reports</h2>
        <p style={{ color: '#939393', fontSize: '14px' }}>White-label reports are available on the Enterprise plan. Contact us to upgrade.</p>
      </div>
    )
  }

  if (loading) return <p style={{ color: '#939393' }}>Loading...</p>

  return (
    <div>
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginBottom: '0.5rem' }}>White-Label Reports</h2>
      <p style={{ fontSize: '13px', color: '#939393', marginBottom: '1.5rem' }}>Customize report branding for your clients</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={cardStyle}>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', color: '#2367a0', marginBottom: '1rem' }}>Branding</h3>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Company Name</label>
            <input value={settings.company_name} onChange={e => setSettings({ ...settings, company_name: e.target.value })} placeholder="Your Agency Name" style={inputStyle} />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Logo URL</label>
            <input value={settings.logo_url || ''} onChange={e => setSettings({ ...settings, logo_url: e.target.value })} placeholder="https://yoursite.com/logo.png" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Primary Color</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="color" value={settings.primary_color} onChange={e => setSettings({ ...settings, primary_color: e.target.value })} style={{ width: '40px', height: '36px', border: 'none', cursor: 'pointer' }} />
                <input value={settings.primary_color} onChange={e => setSettings({ ...settings, primary_color: e.target.value })} style={{ ...inputStyle }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Secondary Color</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="color" value={settings.secondary_color} onChange={e => setSettings({ ...settings, secondary_color: e.target.value })} style={{ width: '40px', height: '36px', border: 'none', cursor: 'pointer' }} />
                <input value={settings.secondary_color} onChange={e => setSettings({ ...settings, secondary_color: e.target.value })} style={{ ...inputStyle }} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Report Footer Text</label>
            <input value={settings.footer_text || ''} onChange={e => setSettings({ ...settings, footer_text: e.target.value })} placeholder="Prepared by Your Agency" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={save} disabled={saving} style={{ ...btnStyle, opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Save Settings'}</button>
            {saved && <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>Saved!</span>}
          </div>
        </div>

        {/* Preview */}
        <div style={cardStyle}>
          <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', color: '#2367a0', marginBottom: '1rem' }}>Report Preview</h3>
          <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: settings.primary_color, padding: '1.5rem', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {settings.logo_url && <img src={settings.logo_url} alt="" style={{ height: '32px' }} />}
                <div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '18px' }}>
                    {settings.company_name || 'Your Company'}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>SEO Audit Report</div>
                </div>
              </div>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1, background: '#f8f9fb', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: settings.primary_color, fontFamily: 'Montserrat, sans-serif' }}>85</div>
                  <div style={{ fontSize: '11px', color: '#939393' }}>Overall Score</div>
                </div>
                <div style={{ flex: 1, background: '#f8f9fb', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: settings.secondary_color, fontFamily: 'Montserrat, sans-serif' }}>A</div>
                  <div style={{ fontSize: '11px', color: '#939393' }}>Grade</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#939393' }}>Technical SEO, Content, Performance...</div>
            </div>
            {settings.footer_text && (
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', padding: '0.75rem 1.5rem', fontSize: '11px', color: '#939393' }}>
                {settings.footer_text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
