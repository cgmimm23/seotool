'use client'

import { useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AiChat({ siteId }: { siteId: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!input.trim() || loading) return

    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const res = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages, siteId }),
    })

    const data = await res.json()
    setMessages([...newMessages, { role: 'assistant', content: data.message || data.error || 'Sorry, something went wrong.' }])
    setLoading(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', width: '56px', height: '56px',
          borderRadius: '50%', background: '#2367a0', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(35,103,160,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', width: '380px', height: '500px',
      background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.15)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: '#2367a0', padding: '14px 16px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px' }}>AI SEO Assistant</div>
          <div style={{ color: '#68ccd1', fontSize: '11px' }}>Ask anything about your site&apos;s SEO</div>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#939393', fontSize: '13px', marginTop: '2rem' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🤖</div>
            <p>Ask me about your SEO performance, issues, or how to use any tool.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%', padding: '10px 14px', borderRadius: '12px',
            fontSize: '13px', lineHeight: 1.5,
            background: m.role === 'user' ? '#2367a0' : '#f8f9fb',
            color: m.role === 'user' ? '#fff' : '#000',
          }}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '12px', background: '#f8f9fb', fontSize: '13px', color: '#939393' }}>
            Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: '8px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about your SEO..."
          style={{
            flex: 1, padding: '8px 12px', background: '#f8f9fb',
            border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px',
            fontSize: '13px', outline: 'none',
          }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{
          padding: '8px 16px', background: '#e4b34f', border: 'none',
          borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer',
          fontSize: '13px', opacity: loading || !input.trim() ? 0.7 : 1,
        }}>
          Send
        </button>
      </div>
    </div>
  )
}
