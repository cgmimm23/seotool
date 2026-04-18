'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Message = { role: 'user' | 'assistant'; content: string }

export default function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const [site, setSite] = useState<any>(null)
  const [email, setEmail] = useState('')
  const pathname = usePathname()
  const supabase = createClient()

  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your SEO assistant. I have full access to this site's audit, keywords, rankings, and crawl data. Ask me anything — what to fix, how to use a tool, or how your site is performing." }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setEmail(session.user.email || '')
      const { data } = await supabase.from('sites').select('id, name, url').eq('id', params.id).single()
      if (data) setSite(data)
    }
    load()
  }, [params.id])

  useEffect(() => {
    if (chatOpen) setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [messages, chatOpen])

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: params.id, messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages([...newMessages, { role: 'assistant', content: data.message }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I ran into an error. Please try again.' }])
    } finally {
      setSending(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const id = params.id

  const navSections = [
    { section: null, items: [{ label: 'Site Overview', href: `/sites/${id}` }] },
    {
      section: 'SEO Tools',
      items: [
        { label: 'Site Audit', href: `/sites/${id}/audit` },
        { label: 'Site Crawler', href: `/sites/${id}/site-crawler` },
        { label: 'On-Page Optimizer', href: `/sites/${id}/on-page-optimizer` },
        { label: 'Keywords', href: `/sites/${id}/keywords` },
        { label: 'SERP Tracker', href: `/sites/${id}/serp` },
        { label: 'Rank History', href: `/sites/${id}/rank-history` },
        { label: 'Page Speed', href: `/sites/${id}/pagespeed` },
        { label: 'AI Visibility', href: `/sites/${id}/ai-visibility` },
        { label: 'Backlinks', href: `/sites/${id}/backlinks` },
      ]
    },
    {
      section: 'Google Data',
      items: [
        { label: 'Analytics', href: `/sites/${id}/analytics` },
        { label: 'Search Console', href: `/sites/${id}/search-console` },
      ]
    },
    {
      section: 'Bing Tools',
      items: [
        { label: 'Bing Webmaster', href: `/sites/${id}/bing-webmaster` },
        { label: 'Bing Places', href: `/sites/${id}/bing-places` },
      ]
    },
    {
      section: 'Meta',
      items: [
        { label: 'Facebook Pages', href: `/sites/${id}/facebook-pages` },
        { label: 'Facebook Reviews', href: `/sites/${id}/facebook-reviews` },
        { label: 'Instagram', href: `/sites/${id}/instagram` },
      ]
    },
    {
      section: 'SEM',
      items: [
        { label: 'Google Ads', href: `/sites/${id}/google-ads` },
        { label: 'Bing Ads', href: `/sites/${id}/bing-ads` },
        { label: 'Facebook Ads', href: `/sites/${id}/facebook-ads` },
      ]
    },
    {
      section: 'Local',
      items: [
        { label: 'Local SEO', href: `/sites/${id}/local-seo` },
        { label: 'Google Reviews', href: `/sites/${id}/reviews` },
        { label: 'Aggregators', href: `/sites/${id}/aggregators` },
      ]
    },
    {
      section: 'Tools',
      items: [
        { label: 'Schema Builder', href: `/sites/${id}/schema` },
        { label: 'Image Tool', href: `/sites/${id}/tools/image` },
        { label: 'GBP Creator', href: `/sites/${id}/tools/gbp-creator` },
      ]
    },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fb' }}>
      <aside style={{ width: '220px', flexShrink: 0, background: '#0d1b2e', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50, overflowY: 'auto' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', marginBottom: '10px' }}>
            <span style={{ color: '#7a8fa8', fontSize: '11px', fontFamily: 'Roboto Mono, monospace' }}>← All Sites</span>
          </a>
          {site ? (
            <>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.name}</div>
              <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '10px', color: '#1e90ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.url?.replace(/^https?:\/\//, '')}</div>
            </>
          ) : (
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>Loading...</div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '0.5rem 0' }}>
          {navSections.map((section, si) => (
            <div key={si}>
              {section.section && (
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.75rem 1rem 0.25rem', fontFamily: 'Roboto Mono, monospace' }}>
                  {section.section}
                </div>
              )}
              {section.items.map(item => {
                const active = pathname === item.href
                return (
                  <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', margin: '1px 0.5rem', borderRadius: '8px', fontSize: '13px', color: active ? '#fff' : 'rgba(255,255,255,0.6)', background: active ? 'rgba(30,144,255,0.3)' : 'transparent', fontWeight: active ? 600 : 400, textDecoration: 'none' }}>
                    {item.label}
                  </a>
                )
              })}
            </div>
          ))}
        </nav>

        {/* AI Assistant Button */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setChatOpen(true)} style={{ width: '100%', background: 'rgba(30,144,255,0.15)', border: '1px solid rgba(30,144,255,0.3)', borderRadius: '10px', padding: '0.6rem', fontSize: '12px', color: '#60a5fa', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', fontWeight: 600 }}>
            <span style={{ fontSize: '16px' }}>✦</span> AI Assistant
          </button>
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
          <button onClick={signOut} style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '0.4rem', fontSize: '12px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>Sign Out</button>
        </div>
      </aside>

      <div style={{ marginLeft: '220px', flex: 1 }}>
        <div style={{ padding: '2rem 1.5rem', maxWidth: '1200px' }}>
          {children}
        </div>
      </div>

      {/* Chat Panel */}
      {chatOpen && (
        <>
          <div onClick={() => setChatOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 98 }} />
          <div style={{ position: 'fixed', bottom: '24px', right: '24px', width: '420px', height: '600px', background: '#fff', borderRadius: '16px', boxShadow: '0 24px 80px rgba(0,0,0,0.2)', zIndex: 99, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', background: '#0d1b2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(30,144,255,0.2)', border: '1px solid rgba(30,144,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>✦</div>
                <div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px', color: '#fff' }}>SEO Assistant</div>
                  <div style={{ fontSize: '11px', color: '#4a6080', fontFamily: 'Roboto Mono, monospace' }}>{site?.name || 'Loading...'}</div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '85%', padding: '0.65rem 0.9rem', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: msg.role === 'user' ? '#1e90ff' : '#f0f4f8', color: msg.role === 'user' ? '#fff' : '#0d1b2e', fontSize: '13px', lineHeight: 1.6, fontFamily: 'Open Sans, sans-serif', whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '0.65rem 0.9rem', borderRadius: '16px 16px 16px 4px', background: '#f0f4f8', display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7a8fa8', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length === 1 && (
              <div style={{ padding: '0 1rem 0.75rem', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['What should I fix first?', 'How is my site performing?', 'How do I improve my score?', 'What keywords should I target?'].map(q => (
                  <button key={q} onClick={() => setInput(q)} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', background: 'rgba(30,144,255,0.06)', border: '1px solid rgba(30,144,255,0.2)', color: '#1e90ff', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>{q}</button>
                ))}
              </div>
            )}

            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: '8px', flexShrink: 0 }}>
              <input type="text" placeholder="Ask anything about your site..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} style={{ flex: 1, background: '#f0f4f8', border: 'none', borderRadius: '10px', padding: '0.6rem 0.85rem', fontSize: '13px', color: '#0d1b2e', outline: 'none', fontFamily: 'Open Sans, sans-serif' }} autoFocus />
              <button onClick={sendMessage} disabled={sending || !input.trim()} style={{ width: '38px', height: '38px', borderRadius: '10px', background: sending || !input.trim() ? '#e4eaf0' : '#1e90ff', border: 'none', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', color: sending || !input.trim() ? '#7a8fa8' : '#fff', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↑</button>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }`}</style>
    </div>
  )
}
