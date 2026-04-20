'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'

function KeywordStrategyInner({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(false)
  const [strategy, setStrategy] = useState<any>(null)
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [error, setError] = useState('')
  const [openCluster, setOpenCluster] = useState<string | null>(null)
  const [openCore, setOpenCore] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/keyword-strategy?siteId=${params.id}`)
      if (res.ok) {
        const json = await res.json()
        if (json.strategies?.[0]) {
          const latest = json.strategies[0]
          setStrategy({
            summary: latest.summary,
            core_phrases: latest.core_phrases,
            long_tail_clusters: latest.long_tail_clusters,
            deployment_strategy: latest.deployment_strategy,
          })
          setLastGenerated(latest.created_at)
          setHistory(json.strategies)
        }
      }
    }
    load()
  }, [params.id])

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/keyword-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: params.id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStrategy(data.strategy)
      setLastGenerated(new Date().toISOString())
      const listRes = await fetch(`/api/keyword-strategy?siteId=${params.id}`)
      if (listRes.ok) {
        const json = await listRes.json()
        setHistory(json.strategies || [])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function trackKeyword(keyword: string, pagePath: string = '/') {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('keywords').insert({
      site_id: params.id,
      user_id: session.user.id,
      page_path: pagePath,
      keyword,
    })
  }

  const card = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }

  const intentColor = (intent: string) => {
    const i = (intent || '').toLowerCase()
    if (i.includes('transactional') || i.includes('commercial')) return '#00d084'
    if (i.includes('local')) return '#1e90ff'
    if (i.includes('informational')) return '#ffa500'
    return '#7a8fa8'
  }

  const diffColor = (d: string) => {
    if (d === 'easy') return '#00d084'
    if (d === 'medium') return '#ffa500'
    if (d === 'hard') return '#ff4444'
    return '#7a8fa8'
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Keyword Strategy</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Core phrases, long-tail clusters, and a deployment plan for your site</p>
      </div>

      <div style={{ ...card, display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button className="btn btn-accent" onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : strategy ? 'Regenerate Strategy' : 'Generate Strategy'}
        </button>
        {loading && <span style={{ fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>Analyzing site, brainstorming keywords, mapping clusters…</span>}
        {lastGenerated && !loading && (
          <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', marginLeft: 'auto' }}>Last generated: {new Date(lastGenerated).toLocaleString()}</span>
        )}
      </div>

      {error && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '8px', padding: '1rem', color: '#ff4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {strategy && (
        <>
          {/* Summary */}
          {strategy.summary && (
            <div style={card}>
              <div style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Summary</div>
              <div style={{ fontSize: '14px', color: '#0d1b2e', lineHeight: 1.6 }}>{strategy.summary}</div>
            </div>
          )}

          {/* Core phrases */}
          {strategy.core_phrases?.length > 0 && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Core Phrases ({strategy.core_phrases.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {strategy.core_phrases.map((c: any, i: number) => {
                  const key = `core-${i}`
                  const isOpen = openCore === key
                  return (
                    <div key={i} style={{ borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', background: '#f8f9fb', overflow: 'hidden' }}>
                      <div onClick={() => setOpenCore(isOpen ? null : key)} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto auto', gap: '10px', alignItems: 'center', padding: '10px 14px', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0d1b2e' }}>{c.phrase}</div>
                          <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', marginTop: '2px' }}>{c.target_page}</div>
                        </div>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: `${intentColor(c.intent)}18`, color: intentColor(c.intent), fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>{c.intent}</span>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: `${diffColor(c.difficulty)}18`, color: diffColor(c.difficulty), fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>{c.difficulty}</span>
                        <button onClick={e => { e.stopPropagation(); trackKeyword(c.phrase) }} style={{ fontSize: '11px', background: 'transparent', border: '1px solid rgba(30,144,255,0.3)', color: '#1e90ff', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}>+ Track</button>
                        <a onClick={e => e.stopPropagation()} href={`/sites/${params.id}/on-page-optimizer?keyword=${encodeURIComponent(c.phrase)}${c.target_page && c.target_page.startsWith('http') ? `&pageUrl=${encodeURIComponent(c.target_page)}` : ''}`} style={{ fontSize: '11px', background: 'transparent', border: '1px solid rgba(0,208,132,0.3)', color: '#00d084', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', textDecoration: 'none' }}>Optimize</a>
                        <span style={{ fontSize: '14px', color: '#7a8fa8', userSelect: 'none' }}>{isOpen ? '▾' : '▸'}</span>
                      </div>
                      {isOpen && (
                        <div style={{ padding: '0 14px 14px 14px' }}>
                          {c.rationale && (
                            <div style={{ marginBottom: '10px' }}>
                              <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Why this phrase</div>
                              <div style={{ fontSize: '13px', color: '#0d1b2e', lineHeight: 1.6 }}>{c.rationale}</div>
                            </div>
                          )}
                          {c.optimization_notes && (
                            <div>
                              <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Optimization notes</div>
                              <div style={{ fontSize: '13px', color: '#0d1b2e', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.optimization_notes}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Long-tail clusters */}
          {strategy.long_tail_clusters?.length > 0 && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Long-Tail Clusters ({strategy.long_tail_clusters.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {strategy.long_tail_clusters.map((cluster: any, i: number) => {
                  const key = `cluster-${i}`
                  const isOpen = openCluster === key
                  return (
                    <div key={i} style={{ borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)', background: '#f8f9fb', overflow: 'hidden' }}>
                      <div onClick={() => setOpenCluster(isOpen ? null : key)} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'center', padding: '10px 14px', cursor: 'pointer' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0d1b2e' }}>{cluster.cluster_name}</div>
                          <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', marginTop: '2px' }}>supports: {cluster.parent_core_phrase}</div>
                        </div>
                        <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{cluster.phrases?.length || 0} phrases</span>
                        <span style={{ fontSize: '14px', color: '#7a8fa8', userSelect: 'none' }}>{isOpen ? '▾' : '▸'}</span>
                      </div>
                      {isOpen && cluster.phrases?.length > 0 && (
                        <div style={{ padding: '0 14px 14px 14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {cluster.phrases.map((p: any, pi: number) => (
                              <div key={pi} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: '8px', alignItems: 'center', padding: '6px 10px', background: '#fff', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.04)' }}>
                                <span style={{ fontSize: '13px', color: '#0d1b2e' }}>{p.phrase}</span>
                                <span style={{ fontSize: '10px', color: intentColor(p.intent), fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>{p.intent}</span>
                                <span style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{p.suggested_page_type}</span>
                                <button onClick={() => trackKeyword(p.phrase)} style={{ fontSize: '11px', background: 'transparent', border: '1px solid rgba(30,144,255,0.3)', color: '#1e90ff', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer' }}>+ Track</button>
                                <a href={`/sites/${params.id}/on-page-optimizer?keyword=${encodeURIComponent(p.phrase)}`} style={{ fontSize: '11px', background: 'transparent', border: '1px solid rgba(0,208,132,0.3)', color: '#00d084', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', textDecoration: 'none' }}>Optimize</a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Deployment strategy */}
          {strategy.deployment_strategy && (
            <div style={card}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Deployment Strategy</div>
              {[
                { key: 'priority_order', title: 'Priority Order (do these in sequence)' },
                { key: 'pillar_pages', title: 'Pillar Pages' },
                { key: 'cluster_content', title: 'Cluster Content' },
                { key: 'internal_linking', title: 'Internal Linking' },
                { key: 'tags_and_categories', title: 'Tags & Categories' },
                { key: 'schema_markup', title: 'Schema Markup' },
              ].map(({ key, title }) => {
                const items: string[] = strategy.deployment_strategy[key] || []
                if (!items.length) return null
                return (
                  <div key={key} style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '10px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{title}</div>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {items.map((item, i) => (
                        <li key={i} style={{ fontSize: '13px', color: '#0d1b2e', lineHeight: 1.6 }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {history.length > 1 && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Previous Strategies</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {history.slice(1).map((s: any) => (
              <div key={s.id} onClick={() => { setStrategy({ summary: s.summary, core_phrases: s.core_phrases, long_tail_clusters: s.long_tail_clusters, deployment_strategy: s.deployment_strategy }); setLastGenerated(s.created_at); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{ padding: '8px 12px', background: '#f8f9fb', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>
                {new Date(s.created_at).toLocaleString()} — {s.core_phrases?.length || 0} core phrases
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !strategy && (
        <div style={card}>
          <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>How keyword strategy works</div>
          <div style={{ fontSize: '13px', color: '#7a8fa8', marginBottom: '1.25rem', lineHeight: 1.6 }}>Great SEO rarely comes from chasing one keyword. This tool builds a topic-cluster architecture for your site: 3-5 core pillar phrases, a long-tail cluster under each, and a deployment plan tailored to your platform (WordPress tags, Shopify collections, Wix categories, etc.).</div>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#0d1b2e', lineHeight: 1.6 }}>
            <li><strong>Click &quot;Generate Strategy&quot;</strong> above. The AI reads your homepage and builds a personalized plan (takes ~30-60 seconds).</li>
            <li><strong>Review the core phrases</strong> and their target pages. Each one is a pillar page to optimize heavily.</li>
            <li><strong>Expand each long-tail cluster</strong> to see related queries grouped by theme — these become your blog / FAQ / service-page content roadmap.</li>
            <li><strong>Use the Deployment Strategy section</strong> as your checklist — it includes platform-specific tag structure, internal linking, and the priority order.</li>
            <li>Click <strong>&quot;Optimize&quot;</strong> next to any phrase to send it straight to the On-Page Optimizer with the keyword pre-filled.</li>
          </ol>
        </div>
      )}
    </div>
  )
}

export default function KeywordStrategyPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: '#7a8fa8', fontSize: '13px' }}>Loading...</div>}>
      <KeywordStrategyInner params={params} />
    </Suspense>
  )
}
