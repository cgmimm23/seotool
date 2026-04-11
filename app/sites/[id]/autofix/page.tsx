'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Fix {
  id: string
  page_url: string
  fix_type: string
  priority: string
  suggested_value: string
  status: string
  applied_by: string | null
  applied_at: string | null
  created_at: string
}

const fixLabels: Record<string, string> = {
  meta_title: 'Meta Title',
  meta_description: 'Meta Description',
  schema_markup: 'Schema Markup',
  alt_text: 'Image Alt Text',
  canonical_tag: 'Canonical URL',
  open_graph: 'Open Graph Tags',
  heading_structure: 'Heading Structure',
  robots_meta: 'Robots Meta',
}

const statusColors: Record<string, { bg: string; color: string }> = {
  pending: { bg: 'rgba(255,165,0,0.1)', color: '#ffa500' },
  applied: { bg: 'rgba(0,208,132,0.1)', color: '#00d084' },
  failed: { bg: 'rgba(255,68,68,0.1)', color: '#ff4444' },
  skipped: { bg: 'rgba(122,143,168,0.1)', color: '#7a8fa8' },
  manual_review: { bg: 'rgba(30,144,255,0.1)', color: '#1e90ff' },
}

const priorityColors: Record<string, string> = {
  high: '#ff4444',
  medium: '#ffa500',
  low: '#7a8fa8',
}

export default function AutoFixPage() {
  const params = useParams()
  const siteId = params.id as string
  const [fixes, setFixes] = useState<Fix[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [siteUrl, setSiteUrl] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: site } = await supabase.from('sites').select('url').eq('id', siteId).single()
      if (site) setSiteUrl(site.url)

      const { data } = await supabase
        .from('fix_instructions')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
        .limit(100)

      setFixes(data || [])
      setLoading(false)
    }
    load()
  }, [siteId])

  async function generateFixes() {
    setGenerating(true)
    const res = await fetch(`/api/v1/sites/${siteId}/fixes`, { method: 'POST' })
    // Reload fixes
    const { data } = await supabase
      .from('fix_instructions')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(100)
    setFixes(data || [])
    setGenerating(false)
  }

  const pending = fixes.filter(f => f.status === 'pending').length
  const applied = fixes.filter(f => f.status === 'applied').length
  const failed = fixes.filter(f => f.status === 'failed').length
  const review = fixes.filter(f => f.status === 'manual_review').length

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>AI AutoFix</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>AI generates fixes from your audit — plugins apply them to your site automatically</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '12px' }}>
        {[
          { label: 'Pending', value: pending, color: '#ffa500' },
          { label: 'Applied', value: applied, color: '#00d084' },
          { label: 'Failed', value: failed, color: '#ff4444' },
          { label: 'Manual Review', value: review, color: '#1e90ff' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem', fontFamily: 'Roboto Mono, monospace' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'Montserrat, sans-serif', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={card}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Generate Fixes</div>
        <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1rem' }}>
          AI analyzes your latest audit and generates specific fix instructions. Install a plugin on your site to auto-apply them.
        </p>
        <button onClick={generateFixes} disabled={generating} className="btn btn-accent" style={{ fontSize: '13px' }}>
          {generating ? 'Generating...' : 'Generate Fixes from Latest Audit'}
        </button>
      </div>

      {/* Download Plugins */}
      <div style={card}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Install Plugin</div>
        <p style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1rem' }}>
          Install a plugin on your site to automatically apply fixes. The plugin connects to this dashboard via your API key.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
          <div style={{ background: '#f8f9fb', borderRadius: '10px', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔧</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>WordPress</div>
            <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '12px' }}>Auto-applies meta, schema, alt text, OG tags. Works with Yoast & RankMath.</div>
            <a href="https://github.com/cgmimm23/seotool/tree/main/plugins/wordpress/seo-autofix" target="_blank" style={{ fontSize: '12px', color: '#1e90ff', textDecoration: 'none', fontWeight: 600 }}>Download Plugin →</a>
          </div>
          <div style={{ background: '#f8f9fb', borderRadius: '10px', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🅳</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Duda</div>
            <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '12px' }}>Auto-applies meta, schema, OG tags via Duda API. Auto-republishes site.</div>
            <a href="https://github.com/cgmimm23/seotool/tree/main/plugins/duda/seo-autofix" target="_blank" style={{ fontSize: '12px', color: '#1e90ff', textDecoration: 'none', fontWeight: 600 }}>Download Plugin →</a>
          </div>
          <div style={{ background: '#f8f9fb', borderRadius: '10px', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🛒</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Shopify</div>
            <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '12px' }}>Coming soon. Fixes product meta, alt text, and structured data.</div>
            <span style={{ fontSize: '12px', color: '#7a8fa8' }}>Coming Soon</span>
          </div>
          <div style={{ background: '#f8f9fb', borderRadius: '10px', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🌐</div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Other Platforms</div>
            <div style={{ fontSize: '12px', color: '#7a8fa8', marginBottom: '12px' }}>Use our API to build custom integrations for any platform.</div>
            <a href="/dashboard/settings/api-keys" style={{ fontSize: '12px', color: '#1e90ff', textDecoration: 'none', fontWeight: 600 }}>Get API Key →</a>
          </div>
        </div>

        <div style={{ marginTop: '1rem', padding: '10px 14px', background: 'rgba(30,144,255,0.05)', border: '1px solid rgba(30,144,255,0.15)', borderRadius: '8px', fontSize: '12px', color: '#4a6080' }}>
          <strong>Setup:</strong> Install the plugin → Enter your API key and Site ID: <code style={{ background: '#f0f4f8', padding: '2px 6px', borderRadius: '4px', fontFamily: 'Roboto Mono, monospace', fontSize: '11px' }}>{siteId}</code> → Click Sync.
        </div>
      </div>

      {/* Fix List */}
      <div style={card}>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Fix Instructions ({fixes.length})</div>

        {loading ? (
          <div style={{ color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>
        ) : fixes.length === 0 ? (
          <div style={{ color: '#7a8fa8', fontSize: '13px' }}>No fixes yet. Run an audit first, then click "Generate Fixes".</div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 100px', gap: '12px', padding: '0.4rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              {['Page', 'Fix Type', 'Priority', 'Status', 'Applied By'].map(h => (
                <div key={h} style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace' }}>{h}</div>
              ))}
            </div>

            {fixes.map(fix => {
              const sc = statusColors[fix.status] || statusColors.pending
              return (
                <div key={fix.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 100px', gap: '12px', padding: '0.75rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#0d1b2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fix.page_url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4a6080' }}>{fixLabels[fix.fix_type] || fix.fix_type}</div>
                  <div style={{ fontSize: '11px', color: priorityColors[fix.priority] || '#7a8fa8', fontWeight: 600, textTransform: 'uppercase' }}>{fix.priority}</div>
                  <div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', fontWeight: 600, background: sc.bg, color: sc.color }}>{fix.status}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#7a8fa8' }}>{fix.applied_by || '—'}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
