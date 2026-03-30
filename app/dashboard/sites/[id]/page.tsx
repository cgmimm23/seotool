'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function SiteDetailPage({ params }: { params: { id: string } }) {
  const [site, setSite] = useState<any>(null)
  const [auditReports, setAuditReports] = useState<any[]>([])
  const [crawlReports, setCrawlReports] = useState<any[]>([])
  const [keywords, setKeywords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'audits' | 'crawls' | 'keywords'>('overview')
  const [runningAudit, setRunningAudit] = useState(false)
  const [auditError, setAuditError] = useState('')
  const supabase = createClient()

  useEffect(() => { loadSiteData() }, [params.id])

  async function loadSiteData() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const [siteRes, auditsRes, crawlsRes, keywordsRes] = await Promise.all([
      supabase.from('sites').select('*').eq('id', params.id).eq('user_id', session.user.id).single(),
      supabase.from('audit_reports').select('*').eq('site_id', params.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('crawl_reports').select('id, url, pages_crawled, total_issues, error_pages, clean_pages, summary, created_at').eq('site_id', params.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('keywords').select('*').eq('site_id', params.id).limit(50),
    ])

    setSite(siteRes.data)
    setAuditReports(auditsRes.data || [])
    setCrawlReports(crawlsRes.data || [])
    setKeywords(keywordsRes.data || [])
    setLoading(false)
  }

  async function runAudit() {
    if (!site) return
    setRunningAudit(true)
    setAuditError('')
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: site.url, siteId: params.id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      loadSiteData()
    } catch (err: any) { setAuditError(err.message) }
    finally { setRunningAudit(false) }
  }

  function scoreColor(s: number) {
    if (s >= 80) return '#00d084'
    if (s >= 60) return '#ffa500'
    return '#ff4444'
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor(diff / 3600000)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }

  const latest = auditReports[0]
  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading site data...</div>
  if (!site) return <div style={{ textAlign: 'center', padding: '3rem', color: '#ff4444', fontSize: '13px' }}>Site not found</div>

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a href="/dashboard" style={{ fontSize: '13px', color: '#7a8fa8', textDecoration: 'none' }}>All Sites</a>
          <span style={{ color: '#7a8fa8' }}>/</span>
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '2px' }}>{site.name}</h2>
            <a href={site.url} target="_blank" style={{ fontSize: '12px', color: '#1e90ff', textDecoration: 'none', fontFamily: 'Roboto Mono, monospace' }}>{site.url}</a>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={runAudit} disabled={runningAudit} className="btn btn-accent">
            {runningAudit ? 'Running Audit...' : 'Run New Audit'}
          </button>
          <a href={`/dashboard/site-crawler?url=${encodeURIComponent(site.url)}`} className="btn btn-ghost" style={{ textDecoration: 'none' }}>Crawl Site</a>
          <a href={`/dashboard/serp?site=${encodeURIComponent(site.url)}`} className="btn btn-ghost" style={{ textDecoration: 'none' }}>SERP</a>
        </div>
      </div>

      {auditError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{auditError}</div>}

      {/* Score cards */}
      {latest && (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', ...card, alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: `4px solid ${scoreColor(latest.overall_score)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'Montserrat, sans-serif', color: scoreColor(latest.overall_score), lineHeight: 1 }}>{latest.overall_score}</span>
            <span style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{latest.grade}</span>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#4a6080', marginBottom: '12px', lineHeight: 1.6 }}>{latest.summary}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
              {Object.entries(latest.categories || {}).map(([name, score]: any) => (
                <div key={name} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: scoreColor(score) }}>{score}</div>
                  <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{name}</div>
                  <div style={{ height: '3px', background: '#f0f4f8', borderRadius: '2px', marginTop: '4px' }}>
                    <div style={{ width: `${score}%`, height: '100%', background: scoreColor(score), borderRadius: '2px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
        {[
          { label: 'Audits Run', value: auditReports.length, color: '#1e90ff' },
          { label: 'Crawl Reports', value: crawlReports.length, color: '#0d1b2e' },
          { label: 'Keywords Tracked', value: keywords.length, color: '#00d084' },
          { label: 'Last Audit', value: auditReports[0] ? timeAgo(auditReports[0].created_at) : 'Never', color: '#0d1b2e' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: '1.5rem' }}>
        {(['overview', 'audits', 'crawls', 'keywords'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '0.5rem 1rem', fontSize: '13px', color: activeTab === t ? '#1e90ff' : '#7a8fa8', cursor: 'pointer', borderBottom: `2px solid ${activeTab === t ? '#1e90ff' : 'transparent'}`, marginBottom: '-1px', fontWeight: activeTab === t ? 600 : 400, background: 'none', border: 'none', fontFamily: 'Open Sans, sans-serif', textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && latest && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={card}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Top Errors</div>
            {(latest.checks || []).filter((c: any) => c.status === 'fail').slice(0, 5).map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(255,68,68,0.1)', color: '#ff4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>X</div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0d1b2e' }}>{c.title}</div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '1px' }}>{c.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={card}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Top Warnings</div>
            {(latest.checks || []).filter((c: any) => c.status === 'warn').slice(0, 5).map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(255,165,0,0.1)', color: '#ffa500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>!</div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0d1b2e' }}>{c.title}</div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '1px' }}>{c.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audits tab */}
      {activeTab === 'audits' && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Audit History</div>
          {auditReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px' }}>No audits yet — click Run New Audit above</div>
          ) : auditReports.map((r, i) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: '12px', alignItems: 'center', padding: '12px 0', borderBottom: i < auditReports.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', border: `2px solid ${scoreColor(r.overall_score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: scoreColor(r.overall_score) }}>{r.overall_score}</span>
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e', marginBottom: '2px' }}>{r.grade} — {r.summary?.substring(0, 80)}...</div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>
                  {Object.entries(r.categories || {}).map(([name, score]: any) => (
                    <span key={name} style={{ color: scoreColor(score) }}>{name}: {score}</span>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>
                {timeAgo(r.created_at)}<br />
                <span style={{ fontSize: '10px' }}>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Crawls tab */}
      {activeTab === 'crawls' && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Crawl History</div>
          {crawlReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px' }}>No crawls yet — go to Site Crawler to scan this site</div>
          ) : crawlReports.map((r, i) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: '16px', alignItems: 'center', padding: '12px 0', borderBottom: i < crawlReports.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e', marginBottom: '2px' }}>{r.pages_crawled} pages crawled</div>
                {r.summary && <div style={{ fontSize: '12px', color: '#7a8fa8' }}>{r.summary.substring(0, 80)}...</div>}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#ff4444', fontFamily: 'Montserrat, sans-serif' }}>{r.total_issues}</div>
                <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>Issues</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#ff4444', fontFamily: 'Montserrat, sans-serif' }}>{r.error_pages}</div>
                <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>Errors</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#00d084', fontFamily: 'Montserrat, sans-serif' }}>{r.clean_pages}</div>
                <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>Clean</div>
              </div>
              <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textAlign: 'right' }}>
                {timeAgo(r.created_at)}<br />
                <span style={{ fontSize: '10px' }}>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Keywords tab */}
      {activeTab === 'keywords' && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Keywords ({keywords.length})</div>
            <a href={`/dashboard/keywords?site=${encodeURIComponent(site.url)}`} className="btn btn-ghost" style={{ fontSize: '12px', textDecoration: 'none' }}>Manage Keywords</a>
          </div>
          {keywords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#7a8fa8', fontSize: '13px' }}>No keywords tracked yet</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Page', 'Keywords', 'Added'].map(h => <th key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', fontWeight: 400, padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', textAlign: 'left', fontFamily: 'Roboto Mono, monospace' }}>{h}</th>)}</tr></thead>
              <tbody>{keywords.map((k, i) => (
                <tr key={k.id} style={{ borderBottom: i < keywords.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', fontFamily: 'Roboto Mono, monospace', color: '#4a6080' }}>{k.page_path || '/'}</td>
                  <td style={{ padding: '0.55rem 0.5rem', fontSize: '12px', color: '#0d1b2e' }}>{(k.keywords || []).join(', ')}</td>
                  <td style={{ padding: '0.55rem 0.5rem', fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{timeAgo(k.created_at)}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
