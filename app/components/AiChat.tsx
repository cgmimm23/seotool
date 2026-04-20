'use client'

import { useState, useRef, useEffect } from 'react'

type ToolCall = { id: string; name: string; input: any; result?: any; error?: string }
interface Message {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
}

const TOOL_LABELS: Record<string, { running: string; done: (r: any) => string }> = {
  add_keywords: {
    running: 'Adding keywords',
    done: r => `Added ${r.added} keyword${r.added === 1 ? '' : 's'} to ${r.page_path}`,
  },
  remove_keyword: {
    running: 'Removing keyword',
    done: r => `Removed "${r.keyword}" (${r.removed})`,
  },
  list_keywords: {
    running: 'Loading keywords',
    done: r => `Found ${r.count} tracked keyword${r.count === 1 ? '' : 's'}`,
  },
  run_audit: {
    running: 'Running full SEO audit',
    done: r => `Audit complete — score ${r.score}/100 (${r.grade}). ${r.fails} errors, ${r.warns} warnings.`,
  },
  run_pagespeed: {
    running: 'Running PageSpeed Insights',
    done: r => `PageSpeed ${r.strategy}: ${r.performance_score}/100 · LCP ${r.lcp} · CLS ${r.cls}`,
  },
  run_serp_check: {
    running: 'Checking Google rankings',
    done: r => r.site_position ? `Ranking #${r.site_position} for "${r.keyword}"` : `Not in top 100 for "${r.keyword}"`,
  },
  run_ai_visibility: {
    running: 'Checking AI visibility',
    done: r => `llms.txt: ${r.llms_txt ? '✓' : '✗'} · ai.txt: ${r.ai_txt ? '✓' : '✗'} · robots.txt: ${r.robots_txt ? '✓' : '✗'}`,
  },
  analyze_page: {
    running: 'Analyzing page',
    done: r => r.score != null ? `Page analysis: ${r.score}/100 — ${r.verdict}` : 'Analysis complete',
  },
  sync_gsc: {
    running: 'Syncing Search Console data',
    done: r => `Synced ${r.synced} data points · ${r.keywords_found} keywords`,
  },
}

function ToolCallRow({ call }: { call: ToolCall }) {
  const label = TOOL_LABELS[call.name]
  const running = label?.running || call.name
  const done = call.error
    ? `${running} failed: ${call.error}`
    : label?.done ? label.done(call.result) : `${running} — done`
  const icon = call.error ? '✕' : '✓'
  const color = call.error ? '#c0392b' : '#2b7a3d'

  return (
    <div style={{
      alignSelf: 'flex-start', maxWidth: '85%',
      background: '#f0f4f8', border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: '10px', padding: '6px 10px', fontSize: '11.5px',
      color: '#2c3e50', fontFamily: 'Roboto Mono, monospace',
      display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <span style={{ color, fontWeight: 700 }}>{icon}</span>
      <span>{done}</span>
    </div>
  )
}

export default function AiChat({ siteId }: { siteId: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          siteId,
        }),
      })
      const data = await res.json()
      setMessages([...newMessages, {
        role: 'assistant',
        content: data.message || data.error || 'Sorry, something went wrong.',
        toolCalls: data.toolCalls || [],
      }])
    } catch (e: any) {
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${e.message}` }])
    }
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
        title="Ask Jonathan"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', width: '400px', height: '560px',
      background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.15)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        background: '#2367a0', padding: '14px 16px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px' }}>Jonathan · SEO Agent</div>
          <div style={{ color: '#68ccd1', fontSize: '11px' }}>Ask me to audit, track keywords, check rankings, anything</div>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }}>✕</button>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#939393', fontSize: '13px', marginTop: '1.5rem', lineHeight: 1.6 }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🤖</div>
            <p style={{ marginBottom: '10px', fontWeight: 600 }}>Hi, I&apos;m Jonathan.</p>
            <p style={{ fontSize: '12px', textAlign: 'left', maxWidth: '280px', margin: '0 auto' }}>
              Try:<br/>
              • &ldquo;Run a full audit&rdquo;<br/>
              • &ldquo;Add keywords &apos;seo tool&apos; and &apos;rank tracker&apos; to /pricing&rdquo;<br/>
              • &ldquo;Check where I rank for best seo software&rdquo;<br/>
              • &ldquo;Sync GSC data for the last 30 days&rdquo;<br/>
              • &ldquo;Analyze my homepage for my target keywords&rdquo;
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.toolCalls?.map(tc => <ToolCallRow key={tc.id} call={tc} />)}
            {m.content && (
              <div style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%', padding: '10px 14px', borderRadius: '12px',
                fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                background: m.role === 'user' ? '#2367a0' : '#f8f9fb',
                color: m.role === 'user' ? '#fff' : '#000',
              }}>
                {m.content}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '12px', background: '#f8f9fb', fontSize: '13px', color: '#939393' }}>
            Jonathan is working...
          </div>
        )}
      </div>

      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: '8px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask Jonathan to do something..."
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
