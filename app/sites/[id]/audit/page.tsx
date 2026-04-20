'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'

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

function labelFor(options: { value: string; label: string }[], value: string) {
  return options.find(o => o.value === value)?.label || value
}

function AuditPageInner({ params }: { params: { id: string } }) {
  const [url, setUrl] = useState('')
  const [siteType, setSiteType] = useState<string>('')
  const [platform, setPlatform] = useState<string>('')
  const [auditNotes, setAuditNotes] = useState<string>('')
  const [editing, setEditing] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [audit, setAudit] = useState<any>(null)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: site } = await supabase.from('sites').select('url, site_type, platform, audit_notes').eq('id', params.id).single()
      if (site?.url) setUrl(site.url)
      if (site?.site_type) setSiteType(site.site_type)
      if (site?.platform) setPlatform(site.platform)
      if (site?.audit_notes) setAuditNotes(site.audit_notes)

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
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          siteId: params.id,
          siteType: siteType || undefined,
          platform: platform || undefined,
        }),
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

  async function saveContext() {
    await supabase.from('sites').update({ site_type: siteType || null, platform: platform || null }).eq('id', params.id)
    setEditing(false)
  }

  async function saveNotes() {
    setSavingNotes(true)
    setNotesSaved(false)
    await supabase.from('sites').update({ audit_notes: auditNotes || null }).eq('id', params.id)
    setSavingNotes(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2500)
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
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', flexWrap: 'wrap' }}>
          {!editing ? (
            <>
              <span>Type: <strong style={{ color: siteType ? '#0d1b2e' : '#bbb' }}>{siteType ? labelFor(SITE_TYPE_OPTIONS, siteType) : 'not set'}</strong></span>
              <span>·</span>
              <span>Platform: <strong style={{ color: platform ? '#0d1b2e' : '#bbb' }}>{platform ? labelFor(PLATFORM_OPTIONS, platform) : 'not set'}</strong></span>
              <span>·</span>
              <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: '#1e90ff', cursor: 'pointer', fontSize: '12px', padding: 0, fontFamily: 'Roboto Mono, monospace' }}>edit</button>
              <span>·</span>
              <button onClick={() => setShowNotes(!showNotes)} style={{ background: 'none', border: 'none', color: '#1e90ff', cursor: 'pointer', fontSize: '12px', padding: 0, fontFamily: 'Roboto Mono, monospace' }}>
                {showNotes ? 'hide notes' : `notes for AI${auditNotes ? ' (set)' : ''}`}
              </button>
            </>
          ) : (
            <>
              <select value={siteType} onChange={e => setSiteType(e.target.value)} className="form-input" style={{ flex: 1, fontSize: '12px' }}>
                <option value="">— Site type —</option>
                {SITE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className="form-input" style={{ flex: 1, fontSize: '12px' }}>
                <option value="">— Platform —</option>
                {PLATFORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button onClick={saveContext} className="btn btn-accent" style={{ fontSize: '12px', padding: '4px 10px' }}>Save</button>
              <button onClick={() => setEditing(false)} className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 10px' }}>Cancel</button>
            </>
          )}
        </div>
        {showNotes && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes for AI</div>
            <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '6px' }}>
              Correct or add context the audit keeps getting wrong. Examples: "Our sitemap is at /sitemap.xml" · "We score 100 on Google PageSpeed, ignore performance concerns" · "We're a roofing company serving Chicago only".
            </div>
            <textarea
              value={auditNotes}
              onChange={e => setAuditNotes(e.target.value)}
              rows={4}
              placeholder="Anything you want the AI to know about this site before it audits..."
              style={{ width: '100%', padding: '8px 10px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
              <button onClick={saveNotes} className="btn btn-accent" disabled={savingNotes} style={{ fontSize: '12px', padding: '4px 12px' }}>{savingNotes ? 'Saving...' : 'Save Notes'}</button>
              {notesSaved && <span style={{ fontSize: '11px', color: '#00d084', fontFamily: 'Roboto Mono, monospace' }}>✓ Saved — will apply on next audit</span>}
            </div>
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

          {/* Next Steps */}
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', borderLeft: '3px solid #1e90ff' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>What to do next</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(() => {
                const failCount = (audit?.checks || []).filter((c: any) => c.status === 'fail').length
                const warnCount = (audit?.checks || []).filter((c: any) => c.status === 'warn').length
                const actions: { title: string; detail: string; href: string }[] = []
                if (failCount > 0) actions.push({ title: `Fix ${failCount} audit error${failCount > 1 ? 's' : ''}`, detail: 'Click into each red-flag check above and follow the platform-specific how-to-fix steps', href: `#` })
                actions.push({ title: 'Run the Site Crawler', detail: 'Audit checks the homepage. Crawl every page on your site to find issues across the whole site', href: `/sites/${params.id}/site-crawler` })
                actions.push({ title: 'Generate a Keyword Strategy', detail: 'Get core phrases and a deployment plan — so you know what to optimize pages for', href: `/sites/${params.id}/keyword-strategy` })
                actions.push({ title: 'Optimize a key page', detail: 'Pick a page and target keyword, then get a Semrush-style page optimization score', href: `/sites/${params.id}/on-page-optimizer` })
                if (warnCount > 0) actions.push({ title: `Address ${warnCount} warning${warnCount > 1 ? 's' : ''}`, detail: 'Warnings are lower priority than errors but still worth fixing', href: `#` })
                return actions.slice(0, 5).map((a, i) => (
                  a.href.startsWith('#') ? (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', padding: '10px 14px', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{a.title}</div>
                        <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>{a.detail}</div>
                      </div>
                    </div>
                  ) : (
                    <a key={i} href={a.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', padding: '10px 14px', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{a.title}</div>
                          <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>{a.detail}</div>
                        </div>
                        <span style={{ fontSize: '18px', color: '#1e90ff', userSelect: 'none' }}>→</span>
                      </div>
                    </a>
                  )
                ))
              })()}
            </div>
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
