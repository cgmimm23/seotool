'use client'

import { useState, useEffect } from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const SITE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'local_service', label: 'Local Service' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'blog_publisher', label: 'Blog / Publisher' },
  { value: 'law_firm', label: 'Law Firm' },
  { value: 'medical_dental', label: 'Medical / Dental' },
  { value: 'restaurant_food', label: 'Restaurant / Food' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'saas_software', label: 'SaaS / Software' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'educational', label: 'Educational' },
  { value: 'portfolio_personal', label: 'Portfolio / Personal' },
  { value: 'other', label: 'Other' },
]

const PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: 'wordpress', label: 'WordPress' },
  { value: 'wix', label: 'Wix' },
  { value: 'squarespace', label: 'Squarespace' },
  { value: 'shopify', label: 'Shopify' },
  { value: 'webflow', label: 'Webflow' },
  { value: 'duda', label: 'Duda' },
  { value: 'godaddy', label: 'GoDaddy Website Builder' },
  { value: 'hubspot', label: 'HubSpot CMS' },
  { value: 'custom_code', label: 'Custom code / Framework' },
  { value: 'other', label: 'Other' },
]

function AuditPageInner() {
  const [url, setUrl] = useState('')
  const [siteType, setSiteType] = useState<string>('')
  const [platform, setPlatform] = useState<string>('')
  const searchParams = useSearchParams()

  useEffect(() => {
    const siteUrl = searchParams.get('site') || searchParams.get('url')
    if (siteUrl) setUrl(siteUrl)
  }, [])
  const [loading, setLoading] = useState(false)
  const [audit, setAudit] = useState<any>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  async function runAudit() {
    if (!url) return
    setLoading(true)
    setError('')
    setAudit(null)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          siteId: null,
          siteType: siteType || undefined,
          platform: platform || undefined,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAudit(data.audit)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function scoreColor(s: number) {
    if (s >= 80) return '#00d084'
    if (s >= 60) return '#ffa500'
    return '#ff4444'
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Site Audit</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>AI-powered full SEO analysis</p>
      </div>

      {/* Input */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="https://yoursite.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runAudit()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-accent" onClick={runAudit} disabled={loading}>
            {loading ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>Optional context:</span>
          <select value={siteType} onChange={e => setSiteType(e.target.value)} className="form-input" style={{ flex: 1, fontSize: '12px' }}>
            <option value="">— Site type —</option>
            {SITE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="form-input" style={{ flex: 1, fontSize: '12px' }}>
            <option value="">— Platform —</option>
            {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '14px', fontFamily: 'Roboto Mono, monospace' }}>
          Analyzing {url}...
        </div>
      )}

      {audit && (
        <>
          {/* Score header */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: `3px solid ${scoreColor(audit.overall)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: scoreColor(audit.overall), lineHeight: 1 }}>{audit.overall}</span>
              <span style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{audit.grade}</span>
            </div>
            <div>
              <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#1e90ff', marginBottom: '4px' }}>{audit.url}</div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '17px', fontWeight: 600 }}>{audit.summary}</div>
              <div style={{ fontSize: '13px', color: '#7a8fa8', marginTop: '4px' }}>
                {audit.checks?.filter((c: any) => c.status === 'fail').length} errors ·{' '}
                {audit.checks?.filter((c: any) => c.status === 'warn').length} warnings ·{' '}
                {audit.checks?.filter((c: any) => c.status === 'pass').length} passing
              </div>
            </div>
          </div>

          {/* Categories */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px', marginBottom: '12px' }}>
            {Object.entries(audit.categories || {}).map(([name, score]: any) => (
              <div key={name} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace' }}>{name}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: scoreColor(score) }}>{score}</div>
                <div style={{ height: '3px', background: '#e4eaf0', borderRadius: '2px', marginTop: '6px' }}>
                  <div style={{ width: `${score}%`, height: '100%', background: scoreColor(score), borderRadius: '2px' }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Checks */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
            {['fail', 'warn', 'pass'].map(status => {
              const items = audit.checks?.filter((c: any) => c.status === status) || []
              if (!items.length) return null
              const labels: any = { fail: 'Errors', warn: 'Warnings', pass: 'Passing' }
              const colors: any = { fail: '#ff4444', warn: '#ffa500', pass: '#00d084' }
              const icons: any = { fail: '✕', warn: '!', pass: '✓' }
              return (
                <div key={status} style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace', marginBottom: '0.5rem' }}>
                    {labels[status]} ({items.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {items.map((check: any, i: number) => {
                      const key = `${status}-${i}`
                      const isOpen = expanded === key
                      const hasDetail = check.explanation || check.how_to_fix
                      return (
                        <div key={i} style={{ borderRadius: '8px', border: `1px solid rgba(0,0,0,0.06)`, borderLeft: `2px solid ${colors[status]}`, background: '#f8f9fb', overflow: 'hidden' }}>
                          <div
                            onClick={() => hasDetail && setExpanded(isOpen ? null : key)}
                            style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto auto', gap: '10px', alignItems: 'start', padding: '10px 14px', cursor: hasDetail ? 'pointer' : 'default' }}
                          >
                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: `${colors[status]}18`, color: colors[status], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, marginTop: '1px' }}>{icons[status]}</div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{check.title}</div>
                              <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>{check.detail}</div>
                            </div>
                            <div style={{ fontSize: '10px', fontFamily: 'Roboto Mono, monospace', color: '#7a8fa8', border: '1px solid rgba(0,0,0,0.08)', padding: '1px 7px', borderRadius: '10px', whiteSpace: 'nowrap' }}>{check.category}</div>
                            {hasDetail && (
                              <div style={{ fontSize: '14px', color: '#7a8fa8', userSelect: 'none' }}>{isOpen ? '▾' : '▸'}</div>
                            )}
                          </div>
                          {isOpen && hasDetail && (
                            <div style={{ padding: '0 14px 14px 44px', background: '#f8f9fb' }}>
                              {check.explanation && (
                                <div style={{ marginBottom: '12px' }}>
                                  <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Why this matters</div>
                                  <div style={{ fontSize: '13px', color: '#0d1b2e', lineHeight: 1.6 }}>{check.explanation}</div>
                                </div>
                              )}
                              {check.how_to_fix && (
                                <div>
                                  <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{status === 'pass' ? 'Maintenance tips' : 'How to fix'}</div>
                                  <div style={{ fontSize: '13px', color: '#0d1b2e', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{check.how_to_fix}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <AuditPageInner />
    </Suspense>
  )
}
