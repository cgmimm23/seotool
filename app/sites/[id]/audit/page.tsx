'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'

const SITE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'local_service', label: 'Local Service (roofing, plumbing, HVAC, etc.)' },
  { value: 'ecommerce', label: 'E-commerce / Online Store' },
  { value: 'blog_publisher', label: 'Blog / Publisher' },
  { value: 'law_firm', label: 'Law Firm' },
  { value: 'medical_dental', label: 'Medical / Dental Practice' },
  { value: 'restaurant_food', label: 'Restaurant / Food Service' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'saas_software', label: 'SaaS / Software' },
  { value: 'professional_services', label: 'Professional Services / Agency' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'educational', label: 'Educational / School / Course' },
  { value: 'portfolio_personal', label: 'Portfolio / Personal Brand' },
  { value: 'other', label: 'Other' },
]

function AuditPageInner({ params }: { params: { id: string } }) {
  const [url, setUrl] = useState('')
  const [siteType, setSiteType] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [audit, setAudit] = useState<any>(null)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showTypePrompt, setShowTypePrompt] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      // Load site URL + site_type
      const { data: site } = await supabase.from('sites').select('url, site_type').eq('id', params.id).single()
      if (site?.url) setUrl(site.url)
      if (site?.site_type) setSiteType(site.site_type)

      // Load last audit report
      const { data: reports } = await supabase
        .from('audit_reports')
        .select('*')
        .eq('site_id', params.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (reports?.[0]) {
        const r = reports[0]
        setLastScanned(r.created_at)
        setAudit({
          url: r.url,
          overall: r.overall_score,
          overall_score: r.overall_score,
          grade: r.grade,
          summary: r.summary,
          categories: r.categories,
          checks: r.checks,
        })
      }
    }
    load()
  }, [params.id])

  async function runAudit() {
    if (!url) return
    // If site type hasn't been set, prompt first so recommendations are tailored
    if (!siteType) {
      setShowTypePrompt(true)
      return
    }
    setShowTypePrompt(false)
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, siteId: params.id, siteType }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAudit(data.audit)
      setLastScanned(new Date().toISOString())
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

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }

  const score = audit?.overall || audit?.overall_score

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Site Audit</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>AI-powered full SEO analysis</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
          <input type="text" className="form-input" placeholder="https://yoursite.com" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && runAudit()} style={{ flex: 1 }} />
          <button className="btn btn-accent" onClick={runAudit} disabled={loading}>{loading ? 'Scanning...' : 'Scan Now'}</button>
          {lastScanned && !loading && (
            <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', whiteSpace: 'nowrap' }}>Last scan: {timeAgo(lastScanned)}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Site type:</label>
          <select value={siteType} onChange={e => setSiteType(e.target.value)} className="form-input" style={{ flex: 1, maxWidth: '420px', fontSize: '13px' }}>
            <option value="">— Select a site type for tailored recommendations —</option>
            {SITE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {showTypePrompt && !siteType && (
          <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: '8px', fontSize: '12px', color: '#8a5a00' }}>
            Please pick a site type so we can tailor the audit to your business.
          </div>
        )}
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '1rem' }}>{error}</div>}

      {loading && <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '14px', fontFamily: 'Roboto Mono, monospace' }}>Analyzing {url}...</div>}

      {!loading && audit && (
        <>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: `3px solid ${scoreColor(score)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: scoreColor(score), lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{audit.grade}</span>
            </div>
            <div>
              <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#1e90ff', marginBottom: '4px' }}>{audit.url}</div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '17px', fontWeight: 600 }}>{audit.summary}</div>
              <div style={{ fontSize: '13px', color: '#7a8fa8', marginTop: '4px' }}>
                {audit.checks?.filter((c: any) => c.status === 'fail').length} errors · {audit.checks?.filter((c: any) => c.status === 'warn').length} warnings · {audit.checks?.filter((c: any) => c.status === 'pass').length} passing
              </div>
            </div>
          </div>

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

          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
            {['fail', 'warn', 'pass'].map(status => {
              const items = audit.checks?.filter((c: any) => c.status === status) || []
              if (!items.length) return null
              const labels: any = { fail: 'Errors', warn: 'Warnings', pass: 'Passing' }
              const colors: any = { fail: '#ff4444', warn: '#ffa500', pass: '#00d084' }
              const icons: any = { fail: '✕', warn: '!', pass: '✓' }
              return (
                <div key={status} style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace', marginBottom: '0.5rem' }}>{labels[status]} ({items.length})</div>
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

      {!loading && !audit && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#7a8fa8' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', color: '#4a6080', marginBottom: '4px' }}>No audit run yet</div>
          <div style={{ fontSize: '13px' }}>Click Scan Now to run your first SEO audit</div>
        </div>
      )}
    </div>
  )
}

export default function AuditPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <AuditPageInner params={params} />
    </Suspense>
  )
}
