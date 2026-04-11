'use client'

import { useEffect, useState } from 'react'

const cardStyle = {
  background: '#fff', borderRadius: '12px', padding: '1.5rem',
  border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
}

const inputStyle = {
  width: '100%', padding: '0.5rem 0.75rem', background: '#f8f9fb',
  border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px',
  color: '#000', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const,
}

interface Broadcast {
  id: string
  subject: string
  body: string
  recipient_filter: string
  recipient_count: number
  sent_at: string
}

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [filter, setFilter] = useState('all')
  const [type, setType] = useState('info')
  const [sendEmail, setSendEmail] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState('')
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])

  useEffect(() => {
    fetch('/api/admin/notifications').then(r => r.json()).then(d => setBroadcasts(d.broadcasts || []))
  }, [])

  async function send() {
    if (!title || !message) return
    setSending(true)
    setResult('')

    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, type, filter, sendEmail, subject: subject || title }),
    })
    const data = await res.json()

    if (data.success) {
      setResult(`Sent to ${data.notificationsSent} users. ${data.emailsSent} emails delivered.`)
      setTitle('')
      setMessage('')
      setSubject('')
      // Refresh history
      const histRes = await fetch('/api/admin/notifications')
      const histData = await histRes.json()
      setBroadcasts(histData.broadcasts || [])
    } else {
      setResult(data.error || 'Failed to send')
    }
    setSending(false)
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '24px', color: '#2367a0', marginBottom: '1.5rem' }}>
        Notifications & Broadcasts
      </h1>

      {/* Compose */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
          Send Message
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Recipients</label>
            <select value={filter} onChange={e => setFilter(e.target.value)} style={inputStyle}>
              <option value="all">All Users</option>
              <option value="starter">Starter Users</option>
              <option value="pro">Pro Users</option>
              <option value="enterprise">Enterprise Users</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="update">Product Update</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Email Subject (optional, defaults to title)</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject line" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#939393', marginBottom: '4px' }}>Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your message..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#000', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
            Also send as email via Resend
          </label>
        </div>

        {result && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem', fontSize: '13px',
            background: result.includes('Sent') ? 'rgba(0,208,132,0.1)' : 'rgba(255,68,68,0.1)',
            color: result.includes('Sent') ? '#00d084' : '#ff4444',
          }}>{result}</div>
        )}

        <button onClick={send} disabled={sending || !title || !message} style={{
          padding: '0.5rem 1.5rem', background: '#e4b34f', border: 'none',
          borderRadius: '50px', color: '#fff', fontWeight: 700, cursor: 'pointer',
          fontSize: '13px', fontFamily: 'Montserrat, sans-serif',
          opacity: sending || !title || !message ? 0.7 : 1,
        }}>
          {sending ? 'Sending...' : 'Send Notification'}
        </button>
      </div>

      {/* History */}
      <div style={{ ...cardStyle, marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '16px', color: '#2367a0', marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>
          Broadcast History
        </h2>
        {broadcasts.length === 0 ? (
          <p style={{ color: '#939393', fontSize: '13px' }}>No broadcasts sent yet</p>
        ) : broadcasts.map(b => (
          <div key={b.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#000', fontWeight: 500 }}>{b.subject}</div>
                <div style={{ fontSize: '12px', color: '#939393', marginTop: '2px' }}>{b.body.substring(0, 100)}{b.body.length > 100 ? '...' : ''}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '12px', color: '#68ccd1', fontWeight: 600 }}>{b.recipient_count} recipients</div>
                <div style={{ fontSize: '11px', color: '#939393' }}>{b.recipient_filter} • {new Date(b.sent_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
