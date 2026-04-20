'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Tool = {
  key: string
  label: string
  score: number | null
  grade?: string
  lastRun: string | null
  href: string
  scoreColor: string
  status: 'none' | 'run' | 'stale'
}

export default function SiteDetailPage({ params }: { params: { id: string } }) {
  const [site, setSite] = useState<any>(null)
  const [audits, setAudits] = useState<any[]>([])
  const [crawls, setCrawls] = useState<any[]>([])
  const [pagespeeds, setPagespeeds] = useState<any[]>([])
  const [aiVis, setAiVis] = useState<any[]>([])
  const [strategies, setStrategies] = useState<any[]>([])
  const [pageOpts, setPageOpts] = useState<any[]>([])
  const [keywords, setKeywords] = useState<any[]>([])
  const [serpRankings, setSerpRankings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [runningAudit, setRunningAudit] = useState(false)
  const [auditError, setAuditError] = useState('')
  const supabase = createClient()

  useEffect(() => { loadSiteData() }, [params.id])

  async function loadSiteData() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const [siteRes, auditsRes, crawlsRes, psRes, aiRes, stratRes, pageOptRes, kwRes, rankRes] = await Promise.all([
      supabase.from('sites').select('*').eq('id', params.id).eq('user_id', session.user.id).single(),
      supabase.from('audit_reports').select('*').eq('site_id', params.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('crawl_reports').select('id, url, pages_crawled, total_issues, error_pages, clean_pages, summary, created_at').eq('site_id', params.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('pagespeed_reports').select('*').eq('site_id', params.id).order('created_at', { ascending: false }).limit(1),
      supabase.from('ai_visibility_reports').select('*').eq('site_id', params.id).order('created_at', { ascending: false }).limit(1),
      supabase.from('keyword_strategies').select('id, created_at, core_phrases').eq('site_id', params.id).order('created_at', { ascending: false }).limit(1),
      supabase.from('page_optimization_reports').select('id, page_url, keyword, optimization_score, created_at').eq('site_id', params.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('keywords').select('*').eq('site_id', params.id),
      supabase.from('serp_rankings').select('keyword_id, position, checked_at').eq('site_id', params.id).gte('checked_at', new Date(Date.now() - 30 * 86400000).toISOString()).order('checked_at', { ascending: false }),
    ])

    setSite(siteRes.data)
    setAudits(auditsRes.data || [])
    setCrawls(crawlsRes.data || [])
    setPagespeeds(psRes.data || [])
    setAiVis(aiRes.data || [])
    setStrategies(stratRes.data || [])
    setPageOpts(pageOptRes.data || [])
    setKeywords(kwRes.data || [])
    setSerpRankings(rankRes.data || [])
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

  function scoreColor(s: number | null) {
    if (s === null) return '#cfd6de'
    if (s >= 80) return '#00d084'
    if (s >= 60) return '#ffa500'
    return '#ff4444'
  }

  function timeAgo(date: string | null) {
    if (!date) return 'never'
    const diff = Date.now() - new Date(date).getTime()
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor(diff / 3600000)
    if (days > 30) return `${Math.floor(days / 30)}mo ago`
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'just now'
  }

  function isStale(date: string | null, maxDays: number) {
    if (!date) return true
    return (Date.now() - new Date(date).getTime()) > maxDays * 86400000
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading site data...</div>
  if (!site) return <div style={{ textAlign: 'center', padding: '3rem', color: '#ff4444', fontSize: '13px' }}>Site not found</div>

  // Derived metrics
  const latestAudit = audits[0]
  const prevAudit = audits[1]
  const auditDelta = latestAudit && prevAudit ? latestAudit.overall_score - prevAudit.overall_score : null

  const latestPS = pagespeeds[0]
  const psMobile = latestPS?.mobile_data?.cats?.performance?.score != null ? Math.round(latestPS.mobile_data.cats.performance.score * 100) : null
  const psDesktop = latestPS?.desktop_data?.cats?.performance?.score != null ? Math.round(latestPS.desktop_data.cats.performance.score * 100) : null

  const latestAI = aiVis[0]
  const aiScore = latestAI?.overall_score ?? latestAI?.result?.aiAnalysis?.overall_score ?? null

  const latestStrategy = strategies[0]
  const corePhraseCount = Array.isArray(latestStrategy?.core_phrases) ? latestStrategy.core_phrases.length : 0

  // Rank movement — count keywords in top 3 / top 10 based on most recent rank per keyword_id
  const latestRankByKeyword = new Map<string, number>()
  for (const r of serpRankings) {
    if (!latestRankByKeyword.has(r.keyword_id)) latestRankByKeyword.set(r.keyword_id, r.position)
  }
  const ranksArr = Array.from(latestRankByKeyword.values())
  const top3 = ranksArr.filter(p => p && p <= 3).length
  const top10 = ranksArr.filter(p => p && p <= 10).length

  const tools: Tool[] = [
    {
      key: 'audit',
      label: 'Site Audit',
      score: latestAudit?.overall_score ?? null,
      grade: latestAudit?.grade,
      lastRun: latestAudit?.created_at ?? null,
      href: `/sites/${params.id}/audit`,
      scoreColor: scoreColor(latestAudit?.overall_score ?? null),
      status: !latestAudit ? 'none' : isStale(latestAudit.created_at, 14) ? 'stale' : 'run',
    },
    {
      key: 'pagespeed_mobile',
      label: 'PageSpeed Mobile',
      score: psMobile,
      lastRun: latestPS?.created_at ?? null,
      href: `/sites/${params.id}/pagespeed`,
      scoreColor: scoreColor(psMobile),
      status: !latestPS ? 'none' : isStale(latestPS.created_at, 30) ? 'stale' : 'run',
    },
    {
      key: 'pagespeed_desktop',
      label: 'PageSpeed Desktop',
      score: psDesktop,
      lastRun: latestPS?.created_at ?? null,
      href: `/sites/${params.id}/pagespeed`,
      scoreColor: scoreColor(psDesktop),
      status: !latestPS ? 'none' : isStale(latestPS.created_at, 30) ? 'stale' : 'run',
    },
    {
      key: 'ai_visibility',
      label: 'AI Visibility',
      score: aiScore,
      lastRun: latestAI?.created_at ?? null,
      href: `/sites/${params.id}/ai-visibility`,
      scoreColor: scoreColor(aiScore),
      status: !latestAI ? 'none' : isStale(latestAI.created_at, 30) ? 'stale' : 'run',
    },
  ]

  // Build "Next Actions" — prioritized list of what the user should do
  const nextActions: { title: string; detail: string; href: string }[] = []
  if (!latestAudit) nextActions.push({ title: 'Run your first Site Audit', detail: 'Get a full SEO score and prioritized fixes', href: `/sites/${params.id}/audit` })
  else if (isStale(latestAudit.created_at, 14)) nextActions.push({ title: 'Re-run Site Audit', detail: `Last run ${timeAgo(latestAudit.created_at)} — audits should be fresh`, href: `/sites/${params.id}/audit` })
  if (!latestStrategy) nextActions.push({ title: 'Generate Keyword Strategy', detail: 'Get core phrases, long-tail clusters, and a deployment plan for your site', href: `/sites/${params.id}/keyword-strategy` })
  if (keywords.length === 0) nextActions.push({ title: 'Add keywords to track', detail: 'Pick the phrases you want to rank for — we track them on Google', href: `/sites/${params.id}/keywords` })
  if (!latestPS) nextActions.push({ title: 'Run PageSpeed test', detail: 'Measure Core Web Vitals on mobile and desktop', href: `/sites/${params.id}/pagespeed` })
  if (!latestAI) nextActions.push({ title: 'Check AI Visibility', detail: 'See how visible your site is to ChatGPT, Perplexity, and other AI engines', href: `/sites/${params.id}/ai-visibility` })
  if (pageOpts.length === 0 && latestStrategy) nextActions.push({ title: 'Optimize a key page', detail: 'Pick a core phrase and run the On-Page Optimizer to score a specific page', href: `/sites/${params.id}/on-page-optimizer` })
  if (crawls.length === 0) nextActions.push({ title: 'Crawl your full site', detail: 'Find technical issues on every page — missing titles, broken pages, thin content', href: `/sites/${params.id}/site-crawler` })
  if (latestAudit) {
    const failCount = (latestAudit.checks || []).filter((c: any) => c.status === 'fail').length
    if (failCount > 0) nextActions.push({ title: `Fix ${failCount} audit error${failCount > 1 ? 's' : ''}`, detail: 'Click into each red-flag check to see exact fix steps', href: `/sites/${params.id}/audit` })
  }

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
        </div>
      </div>

      {auditError && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{auditError}</div>}

      {/* Health scores row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
        {tools.map(t => (
          <a key={t.key} href={t.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ ...card, marginBottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.1s', padding: '1rem' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: `3px solid ${t.scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: t.scoreColor, lineHeight: 1 }}>{t.score ?? '—'}</span>
                {t.grade && <span style={{ fontSize: '9px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{t.grade}</span>}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0d1b2e', textAlign: 'center' }}>{t.label}</div>
              <div style={{ fontSize: '10px', color: t.status === 'stale' ? '#ffa500' : '#7a8fa8', fontFamily: 'Roboto Mono, monospace', marginTop: '2px' }}>
                {t.status === 'none' ? 'not run' : timeAgo(t.lastRun)}
                {t.key === 'audit' && auditDelta !== null && auditDelta !== 0 && (
                  <span style={{ marginLeft: '4px', color: auditDelta > 0 ? '#00d084' : '#ff4444' }}>
                    {auditDelta > 0 ? '↑' : '↓'}{Math.abs(auditDelta)}
                  </span>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
        {[
          { label: 'Tracked Keywords', value: keywords.length, href: `/sites/${params.id}/keywords` },
          { label: 'Top 3 Rankings', value: top3, color: top3 > 0 ? '#00d084' : '#7a8fa8', href: `/sites/${params.id}/rank-history` },
          { label: 'Top 10 Rankings', value: top10, color: top10 > 0 ? '#1e90ff' : '#7a8fa8', href: `/sites/${params.id}/rank-history` },
          { label: 'Core Phrases', value: corePhraseCount, href: `/sites/${params.id}/keyword-strategy` },
        ].map(s => (
          <a key={s.label} href={s.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1rem 1.25rem', cursor: 'pointer' }}>
              <div style={{ fontSize: '10px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
              <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color || '#0d1b2e' }}>{s.value}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Next Actions */}
      {nextActions.length > 0 && (
        <div style={{ ...card, borderLeft: '3px solid #1e90ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Next Actions</div>
            <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>({nextActions.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {nextActions.slice(0, 6).map((a, i) => (
              <a key={i} href={a.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', padding: '10px 14px', background: '#f8f9fb', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{a.title}</div>
                    <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '2px', lineHeight: 1.5 }}>{a.detail}</div>
                  </div>
                  <span style={{ fontSize: '18px', color: '#1e90ff', userSelect: 'none' }}>→</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Categories from latest audit */}
      {latestAudit?.categories && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Audit Category Breakdown</div>
            <a href={`/sites/${params.id}/audit`} style={{ fontSize: '12px', color: '#1e90ff', textDecoration: 'none', fontFamily: 'Roboto Mono, monospace' }}>view full audit →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
            {Object.entries(latestAudit.categories).map(([name, score]: any) => (
              <div key={name} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: scoreColor(score) }}>{score}</div>
                <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{name}</div>
                <div style={{ height: '3px', background: '#f0f4f8', borderRadius: '2px', marginTop: '4px' }}>
                  <div style={{ width: `${score}%`, height: '100%', background: scoreColor(score), borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top errors + warnings */}
      {latestAudit && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={card}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Top Errors</div>
            {(latestAudit.checks || []).filter((c: any) => c.status === 'fail').slice(0, 5).map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(255,68,68,0.1)', color: '#ff4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>X</div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0d1b2e' }}>{c.title}</div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '1px' }}>{c.detail}</div>
                </div>
              </div>
            ))}
            {(latestAudit.checks || []).filter((c: any) => c.status === 'fail').length === 0 && (
              <div style={{ fontSize: '13px', color: '#00d084', textAlign: 'center', padding: '1rem' }}>✓ No errors</div>
            )}
          </div>
          <div style={card}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Top Warnings</div>
            {(latestAudit.checks || []).filter((c: any) => c.status === 'warn').slice(0, 5).map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(255,165,0,0.1)', color: '#ffa500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>!</div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0d1b2e' }}>{c.title}</div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '1px' }}>{c.detail}</div>
                </div>
              </div>
            ))}
            {(latestAudit.checks || []).filter((c: any) => c.status === 'warn').length === 0 && (
              <div style={{ fontSize: '13px', color: '#00d084', textAlign: 'center', padding: '1rem' }}>✓ No warnings</div>
            )}
          </div>
        </div>
      )}

      {/* Recent page optimizations */}
      {pageOpts.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Recent Page Optimizations</div>
            <a href={`/sites/${params.id}/on-page-optimizer`} style={{ fontSize: '12px', color: '#1e90ff', textDecoration: 'none', fontFamily: 'Roboto Mono, monospace' }}>on-page optimizer →</a>
          </div>
          {pageOpts.map((p: any) => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr auto', gap: '10px', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'Roboto Mono, monospace', color: scoreColor(p.optimization_score) }}>{p.optimization_score}</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{p.keyword}</div>
                <div style={{ fontSize: '11px', color: '#1e90ff', fontFamily: 'Roboto Mono, monospace', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.page_url}</div>
              </div>
              <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{timeAgo(p.created_at)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent audits */}
      {audits.length > 0 && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Audit History</div>
            <a href={`/sites/${params.id}/audit`} style={{ fontSize: '12px', color: '#1e90ff', textDecoration: 'none', fontFamily: 'Roboto Mono, monospace' }}>full audit →</a>
          </div>
          {audits.map((r, i) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: '12px', alignItems: 'center', padding: '10px 0', borderBottom: i < audits.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `2px solid ${scoreColor(r.overall_score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: scoreColor(r.overall_score) }}>{r.overall_score}</span>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0d1b2e', marginBottom: '2px' }}>{r.grade} — {r.summary?.substring(0, 90)}...</div>
                <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{timeAgo(r.created_at)}</div>
              </div>
              <a href={`/sites/${params.id}/audit`} style={{ fontSize: '11px', color: '#1e90ff', textDecoration: 'none', fontFamily: 'Roboto Mono, monospace' }}>view →</a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
