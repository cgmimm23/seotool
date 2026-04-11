'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function Dashboard() {
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddSite, setShowAddSite] = useState(false)
  const [newSiteUrl, setNewSiteUrl] = useState('')
  const [newSiteName, setNewSiteName] = useState('')
  const [addingsite, setAddingSite] = useState(false)
  const [scanningId, setScanningId] = useState<string | null>(null)
  const [trialDays, setTrialDays] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadSites()
    // Check trial and onboarding
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      supabase.from('profiles').select('trial_ends_at, onboarding_completed, plan, stripe_subscription_id').eq('id', session.user.id).single().then(({ data }) => {
        if (data && !data.onboarding_completed && !data.stripe_subscription_id) {
          window.location.href = '/dashboard/onboarding'
          return
        }
        if (data?.trial_ends_at && !data.stripe_subscription_id) {
          const days = Math.ceil((new Date(data.trial_ends_at).getTime() - Date.now()) / 86400000)
          if (days > 0) setTrialDays(days)
        }
      })
    })
  }, [])

  async function loadSites() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const { data: sitesData } = await supabase
      .from('sites')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!sitesData || sitesData.length === 0) {
      setSites([])
      setLoading(false)
      return
    }

    // For each site get latest audit report
    const sitesWithData = await Promise.all(sitesData.map(async (site: any) => {
      const { data: reports } = await supabase
        .from('audit_reports')
        .select('*')
        .eq('site_id', site.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const { data: keywords } = await supabase
        .from('keywords')
        .select('*')
        .eq('site_id', site.id)

      const { data: schedule } = await supabase
        .from('scan_schedule')
        .select('*')
        .eq('site_id', site.id)
        .single()

      return {
        ...site,
        latestReport: reports?.[0] || null,
        keywordCount: keywords?.length || 0,
        schedule: schedule || null,
      }
    }))

    setSites(sitesWithData)
    setLoading(false)
  }

  async function addSite() {
    if (!newSiteUrl) return
    setAddingSite(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const url = newSiteUrl.startsWith('http') ? newSiteUrl : 'https://' + newSiteUrl

    const { data, error } = await supabase.from('sites').insert({
      user_id: session.user.id,
      url,
      name: newSiteName || url.replace(/^https?:\/\//, ''),
      active: true,
    }).select().single()

    if (!error && data) {
      await supabase.from('scan_schedule').insert({
        site_id: data.id,
        user_id: session.user.id,
        plan: 'free',
      })
      setNewSiteUrl('')
      setNewSiteName('')
      setShowAddSite(false)
      loadSites()
    }
    setAddingSite(false)
  }

  async function runAudit(site: any) {
    setScanningId(site.id)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: site.url, siteId: site.id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      loadSites()
    } catch (err: any) {
      alert('Audit failed: ' + err.message)
    } finally {
      setScanningId(null)
    }
  }

  async function deleteSite(siteId: string) {
    if (!confirm('Remove this site?')) return
    await supabase.from('sites').delete().eq('id', siteId)
    loadSites()
  }

  function scoreColor(s: number) {
    if (s >= 80) return '#00d084'
    if (s >= 60) return '#ffa500'
    return '#ff4444'
  }

  function scoreGrade(s: number) {
    if (s >= 90) return 'Excellent'
    if (s >= 80) return 'Good'
    if (s >= 60) return 'Needs Work'
    return 'Poor'
  }

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }

  const inputStyle = { width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.55rem 0.85rem', fontSize: '13px', color: '#0d1b2e', outline: 'none', fontFamily: 'Open Sans, sans-serif' }

  return (
    <div>
      {/* Trial Banner */}
      {trialDays !== null && (
        <div style={{ background: 'rgba(104,204,209,0.1)', border: '1px solid rgba(104,204,209,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#2367a0' }}>
            <strong>Free trial:</strong> {trialDays} day{trialDays !== 1 ? 's' : ''} remaining. Upgrade to keep your data.
          </span>
          <a href="/dashboard/settings" style={{ fontSize: '12px', color: '#fff', background: '#e4b34f', padding: '6px 16px', borderRadius: '50px', textDecoration: 'none', fontWeight: 700 }}>Upgrade Now</a>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>All Sites</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>{sites.length} site{sites.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <button className="btn btn-accent" onClick={() => setShowAddSite(true)}>+ Add Site</button>
      </div>

      {/* Add site form */}
      {showAddSite && (
        <div style={{ background: '#fff', border: '1px solid rgba(30,144,255,0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Add New Site</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '8px', alignItems: 'end' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Site URL</div>
              <input type="text" style={inputStyle} placeholder="https://example.com" value={newSiteUrl} onChange={e => setNewSiteUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSite()} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Site Name (optional)</div>
              <input type="text" style={inputStyle} placeholder="My Client Site" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} />
            </div>
            <button className="btn btn-accent" onClick={addSite} disabled={addingsite || !newSiteUrl}>{addingsite ? 'Adding...' : 'Add Site'}</button>
            <button className="btn btn-ghost" onClick={() => setShowAddSite(false)}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#7a8fa8', fontSize: '13px', fontFamily: 'Roboto Mono, monospace' }}>Loading your sites...</div>
      ) : sites.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '4rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No sites yet</div>
          <p style={{ fontSize: '14px', color: '#7a8fa8', marginBottom: '1.5rem' }}>Add your first site to start tracking SEO health, keywords, and rankings.</p>
          <button className="btn btn-accent" onClick={() => setShowAddSite(true)}>Add Your First Site</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {sites.map(site => {
            const report = site.latestReport
            const score = report?.overall_score || null
            const isScanning = scanningId === site.id

            return (
              <div key={site.id} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', overflow: 'hidden', transition: 'border-color 0.2s' }}>

                {/* Card header */}
                <div style={{ padding: '1.25rem 1.25rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 700, color: '#0d1b2e', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.name}</div>
                      <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.url}</div>
                    </div>
                    {score !== null && (
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: `3px solid ${scoreColor(score)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '12px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'Montserrat, sans-serif', color: scoreColor(score), lineHeight: 1 }}>{score}</span>
                        <span style={{ fontSize: '8px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>SEO</span>
                      </div>
                    )}
                  </div>

                  {/* Score grade */}
                  {score !== null && (
                    <div style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '20px', background: `${scoreColor(score)}18`, color: scoreColor(score), marginBottom: '1rem', fontFamily: 'Roboto Mono, monospace' }}>
                      {scoreGrade(score)}
                    </div>
                  )}

                  {/* Summary */}
                  {report?.summary && (
                    <p style={{ fontSize: '12px', color: '#7a8fa8', lineHeight: 1.5, marginBottom: '1rem' }}>{report.summary}</p>
                  )}
                </div>

                {/* Stats row */}
                {report && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    {[
                      { label: 'Errors', value: (report.checks || []).filter((c: any) => c.status === 'fail').length, color: '#ff4444' },
                      { label: 'Warnings', value: (report.checks || []).filter((c: any) => c.status === 'warn').length, color: '#ffa500' },
                      { label: 'Keywords', value: site.keywordCount, color: '#1e90ff' },
                    ].map((s, i) => (
                      <div key={s.label} style={{ padding: '10px', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Category bars */}
                {report?.categories && (
                  <div style={{ padding: '12px 1.25rem' }}>
                    {Object.entries(report.categories).map(([name, val]: any) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <div style={{ fontSize: '10px', color: '#7a8fa8', width: '80px', flexShrink: 0, fontFamily: 'Roboto Mono, monospace' }}>{name}</div>
                        <div style={{ flex: 1, height: '4px', background: '#f0f4f8', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${val}%`, height: '100%', background: scoreColor(val), borderRadius: '2px' }} />
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'Roboto Mono, monospace', color: scoreColor(val), width: '24px', textAlign: 'right' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Scan info */}
                <div style={{ padding: '8px 1.25rem', background: '#f8f9fb', fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Last scan: {report ? timeAgo(report.created_at) : 'Never'}</span>
                  {site.schedule?.next_scan_at && <span>Next: {timeAgo(site.schedule.next_scan_at)}</span>}
                </div>

                {/* Action buttons */}
                <div style={{ padding: '12px 1.25rem', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <a href={`/sites/${site.id}`} className="btn btn-accent" style={{ fontSize: '12px', padding: '5px 12px', flex: 1, textDecoration: 'none', textAlign: 'center' }}>View Site</a>
                  <button onClick={() => runAudit(site)} disabled={isScanning} className="btn btn-ghost" style={{ fontSize: '12px', padding: '5px 12px' }}>
                    {isScanning ? '...' : 'Audit'}
                  </button>
                  <a href={`/dashboard/serp?site=${encodeURIComponent(site.url)}`} className="btn btn-ghost" style={{ fontSize: '12px', padding: '5px 12px', textDecoration: 'none' }}>SERP</a>
                  <button onClick={() => deleteSite(site.id)} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '12px', cursor: 'pointer', padding: '5px 8px', borderRadius: '6px' }}>Remove</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
