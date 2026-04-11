'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Report {
  id: string
  page_url: string
  page_title: string
  issues_found: any[]
  fixes_applied: any[]
  created_at: string
}

export default function SeoAgentPage() {
  const params = useParams()
  const siteId = params.id as string
  const [enabled, setEnabled] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: site } = await supabase.from('sites').select('agent_enabled').eq('id', siteId).single()
      setEnabled(site?.agent_enabled || false)

      const { data } = await supabase
        .from('agent_reports')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
        .limit(50)

      setReports(data || [])
      setLoading(false)
    }
    load()
  }, [siteId])

  async function toggleAgent() {
    setToggling(true)
    await supabase.from('sites').update({ agent_enabled: !enabled }).eq('id', siteId)
    setEnabled(!enabled)
    setToggling(false)
  }

  function copySnippet() {
    const snippet = `<script src="https://seo.cgmimm.com/api/agent/${siteId}" defer></script>`
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  // Stats
  const uniquePages = new Set(reports.map(r => r.page_url)).size
  const totalIssues = reports.reduce((a, r) => a + (r.issues_found?.length || 0), 0)
  const totalFixes = reports.reduce((a, r) => a + (r.fixes_applied?.length || 0), 0)
  const lastActivity = reports[0]?.created_at

  // Fixes breakdown
  const fixCounts: Record<string, number> = {}
  reports.forEach(r => (r.fixes_applied || []).forEach((f: any) => { fixCounts[f.type] = (fixCounts[f.type] || 0) + 1 }))

  const fixLabels: Record<string, string> = {
    injected_meta_description: 'Meta descriptions added',
    injected_canonical: 'Canonical URLs added',
    injected_viewport: 'Viewport tags added',
    injected_og_title: 'OG title tags added',
    injected_og_description: 'OG description tags added',
    injected_og_url: 'OG URL tags added',
    injected_og_type: 'OG type tags added',
    injected_schema: 'Schema markup added',
    injected_alt: 'Image alt text generated',
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>AI SEO Agent</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Automatically fixes SEO issues on your site in real time</p>
      </div>

      {/* Script Snippet */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600 }}>Agent Script</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: enabled ? '#00d084' : '#7a8fa8', fontWeight: 600 }}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
            <button
              onClick={toggleAgent}
              disabled={toggling}
              style={{
                width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: enabled ? '#00d084' : '#e4eaf0', position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '3px', transition: 'left 0.2s',
                left: enabled ? '23px' : '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        </div>

        <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '12px' }}>
          Add this script to your website&apos;s HTML, just before the closing <code style={{ background: '#f0f4f8', padding: '2px 6px', borderRadius: '4px' }}>&lt;/body&gt;</code> tag.
          The AI agent will automatically scan each page and fix SEO issues in real time.
        </p>

        <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', fontFamily: 'Roboto Mono, monospace', fontSize: '12px', color: '#0d1b2e', wordBreak: 'break-all', marginBottom: '8px' }}>
          {`<script src="https://seo.cgmimm.com/api/agent/${siteId}" defer></script>`}
        </div>

        <button onClick={copySnippet} className="btn btn-accent" style={{ fontSize: '12px' }}>
          {copied ? '✓ Copied!' : 'Copy Snippet'}
        </button>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
          {[
            { label: 'Pages Scanned', value: uniquePages, color: '#1e90ff' },
            { label: 'Issues Found', value: totalIssues, color: '#ffa500' },
            { label: 'Fixes Applied', value: totalFixes, color: '#00d084' },
            { label: 'Last Activity', value: lastActivity ? new Date(lastActivity).toLocaleDateString() : 'None', color: '#0d1b2e' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
              <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Fixes Breakdown */}
      {Object.keys(fixCounts).length > 0 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Fixes Breakdown</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
            {Object.entries(fixCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
              <div key={type} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#00d084', fontFamily: 'Montserrat, sans-serif' }}>{count}</div>
                <div style={{ fontSize: '11px', color: '#7a8fa8' }}>{fixLabels[type] || type.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div style={card}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Recent Activity</div>

        {loading ? (
          <div style={{ color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>
        ) : reports.length === 0 ? (
          <div style={{ color: '#7a8fa8', fontSize: '13px' }}>No agent activity yet. Enable the agent and add the script to your site.</div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 140px', gap: '12px', padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              {['Page', 'Issues', 'Fixes', 'Time'].map(h => (
                <div key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace' }}>{h}</div>
              ))}
            </div>

            {reports.map(r => (
              <div key={r.id}>
                <div
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 140px', gap: '12px', padding: '0.75rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '13px', color: '#0d1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.page_url.replace(/^https?:\/\/[^/]+/, '')}
                  </div>
                  <div style={{ fontSize: '13px', color: '#ffa500', fontFamily: 'Roboto Mono, monospace' }}>{r.issues_found?.length || 0}</div>
                  <div style={{ fontSize: '13px', color: '#00d084', fontFamily: 'Roboto Mono, monospace' }}>{r.fixes_applied?.length || 0}</div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{new Date(r.created_at).toLocaleString()}</div>
                </div>

                {expanded === r.id && (
                  <div style={{ padding: '12px', background: '#f8f9fb', borderRadius: '8px', margin: '4px 0 8px', fontSize: '12px' }}>
                    {r.issues_found?.length > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontWeight: 600, color: '#ffa500', marginBottom: '4px' }}>Issues Found:</div>
                        {r.issues_found.map((issue: any, i: number) => (
                          <div key={i} style={{ color: '#4a6080', padding: '2px 0' }}>• {issue.detail || issue.type}</div>
                        ))}
                      </div>
                    )}
                    {r.fixes_applied?.length > 0 && (
                      <div>
                        <div style={{ fontWeight: 600, color: '#00d084', marginBottom: '4px' }}>Fixes Applied:</div>
                        {r.fixes_applied.map((fix: any, i: number) => (
                          <div key={i} style={{ color: '#4a6080', padding: '2px 0' }}>• {fixLabels[fix.type] || fix.type}: {fix.value?.substring(0, 80)}{fix.value?.length > 80 ? '...' : ''}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
