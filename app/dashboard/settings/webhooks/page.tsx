'use client'

import { useEffect, useState } from 'react'

const cardStyle = { background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.08)' }
const inputStyle = { width: '100%', padding: '0.5rem 0.75rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', color: '#000', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }
const btnStyle = { padding: '0.5rem 1.25rem', background: '#e4b34f', border: 'none', borderRadius: '50px', color: '#fff', fontWeight: 700 as const, cursor: 'pointer', fontSize: '13px', fontFamily: 'Montserrat, sans-serif' }

const EVENTS = ['audit.completed', 'ranking.changed', 'ranking.improved', 'ranking.dropped', 'site.added', 'test.ping']

interface Webhook { id: string; url: string; events: string[]; active: boolean; description: string; last_triggered_at: string | null; failure_count: number; created_at: string }

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newEvents, setNewEvents] = useState<string[]>(['audit.completed'])
  const [newSecret, setNewSecret] = useState('')

  async function fetchWebhooks() {
    const res = await fetch('/api/webhooks')
    if (res.status === 403) { setError('Enterprise plan required'); setLoading(false); return }
    const data = await res.json()
    setWebhooks(data.webhooks || [])
    setLoading(false)
  }

  useEffect(() => { fetchWebhooks() }, [])

  async function createWebhook() {
    if (!newUrl) return
    const res = await fetch('/api/webhooks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl, events: newEvents, description: newDesc }),
    })
    const data = await res.json()
    if (data.secret) { setNewSecret(data.secret); setShowCreate(false); setNewUrl(''); setNewDesc(''); fetchWebhooks() }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/webhooks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !active }) })
    fetchWebhooks()
  }

  async function deleteWebhook(id: string) {
    if (!confirm('Delete this webhook?')) return
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    fetchWebhooks()
  }

  async function testWebhook(id: string) {
    await fetch(`/api/webhooks/${id}/test`, { method: 'POST' })
    alert('Test event sent!')
    fetchWebhooks()
  }

  if (error === 'Enterprise plan required') {
    return (
      <div style={cardStyle}>
        <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0', marginBottom: '0.5rem' }}>Webhooks</h2>
        <p style={{ color: '#939393', fontSize: '14px' }}>Custom integrations are available on the Enterprise plan. Contact us to upgrade.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '20px', color: '#2367a0' }}>Webhooks</h2>
          <p style={{ fontSize: '13px', color: '#939393' }}>Get notified when events happen in your account</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btnStyle}>+ New Webhook</button>
      </div>

      {newSecret && (
        <div style={{ ...cardStyle, background: '#f0fdf4', border: '1px solid #22c55e', marginBottom: '1rem' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>Webhook signing secret (save it now):</p>
          <code style={{ fontSize: '12px', wordBreak: 'break-all', color: '#166534', background: 'rgba(34,197,94,0.1)', padding: '8px 12px', borderRadius: '6px', display: 'block' }}>{newSecret}</code>
          <button onClick={() => { navigator.clipboard.writeText(newSecret); setNewSecret('') }} style={{ ...btnStyle, marginTop: '8px', background: '#22c55e' }}>Copy & Dismiss</button>
        </div>
      )}

      {showCreate && (
        <div style={{ ...cardStyle, marginBottom: '1rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Endpoint URL</label>
            <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://yourapp.com/webhook" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Description</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional description" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '8px' }}>Events</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {EVENTS.map(ev => (
                <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer', color: newEvents.includes(ev) ? '#2367a0' : '#939393' }}>
                  <input type="checkbox" checked={newEvents.includes(ev)} onChange={e => setNewEvents(e.target.checked ? [...newEvents, ev] : newEvents.filter(x => x !== ev))} />
                  {ev}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={createWebhook} style={btnStyle}>Create</button>
            <button onClick={() => setShowCreate(false)} style={{ ...btnStyle, background: 'transparent', color: '#939393', border: '1px solid rgba(0,0,0,0.1)' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={cardStyle}>
        {loading ? <p style={{ color: '#939393' }}>Loading...</p> : webhooks.length === 0 ? (
          <p style={{ color: '#939393', fontSize: '14px' }}>No webhooks configured yet.</p>
        ) : webhooks.map(w => (
          <div key={w.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#000', fontWeight: 500 }}>{w.url}</div>
                {w.description && <div style={{ fontSize: '12px', color: '#939393' }}>{w.description}</div>}
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {w.events.map(ev => (
                    <span key={ev} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(104,204,209,0.1)', color: '#68ccd1' }}>{ev}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {w.failure_count > 0 && <span style={{ fontSize: '11px', color: '#ef4444' }}>{w.failure_count} failures</span>}
                <button onClick={() => toggleActive(w.id, w.active)} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, background: w.active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: w.active ? '#22c55e' : '#ef4444' }}>{w.active ? 'Active' : 'Paused'}</button>
                <button onClick={() => testWebhook(w.id)} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', cursor: 'pointer', color: '#939393' }}>Test</button>
                <button onClick={() => deleteWebhook(w.id)} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
