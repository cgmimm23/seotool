'use client'

import { useState } from 'react'

export default function WritingAssistantPage() {
  const [tab, setTab] = useState<'outline' | 'write' | 'analyze'>('outline')
  const [topic, setTopic] = useState('')
  const [keywords, setKeywords] = useState('')
  const [targetLength, setTargetLength] = useState('1500')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  async function submit() {
    setLoading(true)
    setResult('')
    const body: any = { action: tab, topic, keywords: keywords.split(',').map(k => k.trim()).filter(Boolean), targetLength: parseInt(targetLength) }
    if (tab === 'analyze') body.content = content

    const res = await fetch('/api/writing-assistant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setResult(data.result || data.error || 'No result')
    setLoading(false)
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const inputStyle = { width: '100%', padding: '0.6rem 0.85rem', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>SEO Writing Assistant</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>AI helps you create SEO-optimized content with proper keywords, structure, and readability</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {([['outline', 'Generate Outline'], ['write', 'Write Article'], ['analyze', 'Analyze Content']] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key as any); setResult('') }} style={{
            padding: '8px 20px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
            border: `1px solid ${tab === key ? '#1e90ff' : 'rgba(0,0,0,0.1)'}`,
            background: tab === key ? 'rgba(30,144,255,0.08)' : 'transparent',
            color: tab === key ? '#1e90ff' : '#7a8fa8', fontWeight: tab === key ? 600 : 400,
          }}>{label}</button>
        ))}
      </div>

      <div style={card}>
        {(tab === 'outline' || tab === 'write') && (
          <>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7a8fa8', marginBottom: '4px' }}>Topic / Title</label>
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. How to improve your website's page speed" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7a8fa8', marginBottom: '4px' }}>Target Keywords (comma-separated)</label>
                <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="page speed, core web vitals, LCP" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#7a8fa8', marginBottom: '4px' }}>Word Count</label>
                <input value={targetLength} onChange={e => setTargetLength(e.target.value)} type="number" style={inputStyle} />
              </div>
            </div>
          </>
        )}

        {tab === 'analyze' && (
          <>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7a8fa8', marginBottom: '4px' }}>Target Keywords (comma-separated)</label>
              <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="page speed, core web vitals" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#7a8fa8', marginBottom: '4px' }}>Paste Your Content</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Paste article text here..." rows={10} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </>
        )}

        <button onClick={submit} disabled={loading || (tab !== 'analyze' && !topic) || (tab === 'analyze' && !content)} className="btn btn-accent" style={{ fontSize: '13px' }}>
          {loading ? 'AI is working...' : tab === 'outline' ? 'Generate Outline' : tab === 'write' ? 'Write Article' : 'Analyze Content'}
        </button>
      </div>

      {result && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: '#2367a0' }}>
            {tab === 'outline' ? 'Content Outline' : tab === 'write' ? 'Generated Article' : 'Content Analysis'}
          </div>
          <div style={{ fontSize: '14px', color: '#4a6080', lineHeight: 1.8, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: result }} />
          <div style={{ marginTop: '12px' }}>
            <button onClick={() => { navigator.clipboard.writeText(result); alert('Copied!') }} style={{ fontSize: '12px', padding: '6px 16px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', cursor: 'pointer', color: '#7a8fa8' }}>Copy to Clipboard</button>
          </div>
        </div>
      )}
    </div>
  )
}
