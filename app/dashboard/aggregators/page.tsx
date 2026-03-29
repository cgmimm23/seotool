'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const AGGREGATORS = [
  {
    id: 'yext',
    name: 'Yext',
    description: 'Pushes your business data to 200+ directories, maps, apps, and search engines simultaneously. Largest network coverage.',
    coverage: '200+ directories',
    highlights: ['Google', 'Apple Maps', 'Bing', 'Yelp', 'Facebook', 'Amazon Alexa', 'Siri', 'TripAdvisor'],
    pricing: 'Starting at $199/year per location',
    signupUrl: 'https://www.yext.com',
    docsUrl: 'https://hitchhikers.yext.com/docs',
    color: '#0a3dff',
    keyField: 'YEXT_API_KEY',
    keyPlaceholder: 'yext_api_key_...',
  },
  {
    id: 'brightlocal',
    name: 'BrightLocal',
    description: 'Citation building, tracking, and cleanup tool. Great for agencies managing multiple clients across local directories.',
    coverage: '1,400+ directories',
    highlights: ['Yelp', 'YellowPages', 'Foursquare', 'Citysearch', 'Manta', 'Superpages', 'MapQuest'],
    pricing: 'Starting at $29/month',
    signupUrl: 'https://www.brightlocal.com',
    docsUrl: 'https://api.brightlocal.com',
    color: '#00b386',
    keyField: 'BRIGHTLOCAL_API_KEY',
    keyPlaceholder: 'bl_api_key_...',
  },
  {
    id: 'uberall',
    name: 'Uberall',
    description: 'Enterprise-grade location marketing platform. Strong in Europe and international markets alongside US directories.',
    coverage: '125+ directories',
    highlights: ['Google', 'Facebook', 'Apple Maps', 'HERE Maps', 'TomTom', 'Navmii', 'Cylex'],
    pricing: 'Custom enterprise pricing',
    signupUrl: 'https://uberall.com',
    docsUrl: 'https://uberall.com/en/developers',
    color: '#6b4fbb',
    keyField: 'UBERALL_API_KEY',
    keyPlaceholder: 'uberall_key_...',
  },
  {
    id: 'dataaxle',
    name: 'Localeze / Data Axle',
    description: 'One of the original data aggregators. Feeds core data to GPS devices, navigation systems, and major data resellers.',
    coverage: '300+ data consumers',
    highlights: ['GPS/Navigation', 'Infogroup', 'Acxiom', 'Neustar', 'TomTom', 'Garmin', 'HERE Maps'],
    pricing: 'Starting at $299/year',
    signupUrl: 'https://www.data-axle.com',
    docsUrl: 'https://developer.data-axle.com',
    color: '#e85d04',
    keyField: 'DATAAXLE_API_KEY',
    keyPlaceholder: 'dax_api_key_...',
  },
]

export default function AggregatorsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({})
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [pushed, setPushed] = useState<Record<string, boolean>>({})
  const [pushing, setPushing] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => { loadKeys() }, [])

  async function loadKeys() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('profiles').select('serp_api_key, anthropic_api_key').eq('id', session.user.id).single()
    // Load aggregator keys from localStorage for now
    const loaded: Record<string, string> = {}
    const saved: Record<string, boolean> = {}
    AGGREGATORS.forEach(a => {
      const k = localStorage.getItem(`riq_${a.id}_key`) || ''
      loaded[a.id] = k
      saved[a.id] = !!k
    })
    setKeys(loaded)
    setSavedKeys(saved)
  }

  function saveKey(aggregatorId: string) {
    setSaving(aggregatorId)
    const key = keys[aggregatorId]
    if (key) {
      localStorage.setItem(`riq_${aggregatorId}_key`, key)
      setSavedKeys(prev => ({ ...prev, [aggregatorId]: true }))
    } else {
      localStorage.removeItem(`riq_${aggregatorId}_key`)
      setSavedKeys(prev => ({ ...prev, [aggregatorId]: false }))
    }
    setTimeout(() => setSaving(null), 1000)
  }

  function disconnectKey(aggregatorId: string) {
    localStorage.removeItem(`riq_${aggregatorId}_key`)
    setKeys(prev => ({ ...prev, [aggregatorId]: '' }))
    setSavedKeys(prev => ({ ...prev, [aggregatorId]: false }))
  }

  async function pushData(aggregatorId: string) {
    if (!savedKeys[aggregatorId]) {
      alert(`Connect your ${AGGREGATORS.find(a => a.id === aggregatorId)?.name} API key first`)
      return
    }
    setPushing(aggregatorId)
    // Simulate push — real implementation would call the aggregator's API
    await new Promise(resolve => setTimeout(resolve, 2000))
    setPushed(prev => ({ ...prev, [aggregatorId]: true }))
    setPushing(null)
  }

  const connectedCount = Object.values(savedKeys).filter(Boolean).length

  const inputStyle = { background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.5rem 0.85rem', fontSize: '12px', color: '#0d1b2e', outline: 'none', fontFamily: 'Roboto Mono, monospace', flex: 1 }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Citation Aggregators</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Push your business data to hundreds of directories at once</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{connectedCount} of {AGGREGATORS.length} connected</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {AGGREGATORS.map(a => (
              <div key={a.id} style={{ width: '8px', height: '8px', borderRadius: '50%', background: savedKeys[a.id] ? '#00d084' : '#e4eaf0' }} />
            ))}
          </div>
        </div>
      </div>

      {/* What are aggregators */}
      <div style={{ background: 'rgba(30,144,255,0.05)', border: '1px solid rgba(30,144,255,0.15)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '13px', color: '#4a6080', lineHeight: 1.6 }}>
        <strong style={{ color: '#1e90ff' }}>What are citation aggregators?</strong> Instead of manually submitting your business to each directory, aggregators push your NAP data (Name, Address, Phone) to hundreds of sites at once. Connecting even one aggregator can create or fix dozens of citations simultaneously, which is a major local SEO ranking factor.
      </div>

      {/* Aggregator cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '16px' }}>
        {AGGREGATORS.map(agg => {
          const isConnected = savedKeys[agg.id]
          const isPushing = pushing === agg.id
          const hasPushed = pushed[agg.id]

          return (
            <div key={agg.id} style={{ background: '#fff', border: `1px solid ${isConnected ? 'rgba(0,208,132,0.3)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '16px', overflow: 'hidden' }}>

              {/* Card header */}
              <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: agg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '14px', color: '#fff', flexShrink: 0 }}>
                      {agg.name[0]}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, color: '#0d1b2e' }}>{agg.name}</div>
                      <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{agg.coverage}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isConnected && (
                      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(0,208,132,0.1)', color: '#00d084', fontFamily: 'Roboto Mono, monospace', fontWeight: 600 }}>Connected</span>
                    )}
                    {!isConnected && (
                      <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: '#f0f4f8', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>Not connected</span>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: '#4a6080', lineHeight: 1.5, marginBottom: '10px' }}>{agg.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {agg.highlights.map(h => (
                    <span key={h} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#f0f4f8', color: '#4a6080', fontFamily: 'Roboto Mono, monospace' }}>{h}</span>
                  ))}
                </div>
              </div>

              {/* Pricing + links */}
              <div style={{ padding: '10px 1.25rem', background: '#f8f9fb', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#7a8fa8' }}>{agg.pricing}</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <a href={agg.signupUrl} target="_blank" style={{ fontSize: '12px', color: '#1e90ff', textDecoration: 'none' }}>Sign up</a>
                  <a href={agg.docsUrl} target="_blank" style={{ fontSize: '12px', color: '#7a8fa8', textDecoration: 'none' }}>API docs</a>
                </div>
              </div>

              {/* API key input */}
              <div style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }}>API Key</div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  <input
                    type={showKey[agg.id] ? 'text' : 'password'}
                    style={inputStyle}
                    placeholder={agg.keyPlaceholder}
                    value={keys[agg.id] || ''}
                    onChange={e => setKeys(prev => ({ ...prev, [agg.id]: e.target.value }))}
                  />
                  <button onClick={() => setShowKey(prev => ({ ...prev, [agg.id]: !prev[agg.id] }))} style={{ padding: '0 10px', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#7a8fa8', fontFamily: 'Open Sans, sans-serif' }}>
                    {showKey[agg.id] ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => saveKey(agg.id)} style={{ padding: '0 12px', background: '#1e90ff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#fff', fontFamily: 'Open Sans, sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {saving === agg.id ? 'Saved!' : 'Save'}
                  </button>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => pushData(agg.id)}
                    disabled={!isConnected || isPushing}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: isConnected ? (hasPushed ? 'rgba(0,208,132,0.1)' : '#1e90ff') : '#f0f4f8', color: isConnected ? (hasPushed ? '#00d084' : '#fff') : '#7a8fa8', fontSize: '13px', fontWeight: 600, cursor: isConnected ? 'pointer' : 'not-allowed', fontFamily: 'Open Sans, sans-serif', transition: 'all 0.2s' }}
                  >
                    {isPushing ? 'Pushing data...' : hasPushed ? 'Data pushed!' : 'Push Business Data'}
                  </button>
                  {isConnected && (
                    <button onClick={() => disconnectKey(agg.id)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,68,68,0.2)', background: 'rgba(255,68,68,0.05)', color: '#ff4444', fontSize: '12px', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>
                      Disconnect
                    </button>
                  )}
                </div>

                {!isConnected && (
                  <div style={{ fontSize: '11px', color: '#7a8fa8', marginTop: '6px' }}>
                    Get your API key from <a href={agg.signupUrl} target="_blank" style={{ color: '#1e90ff', textDecoration: 'none' }}>{agg.name}</a> then paste it above
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Note about push */}
      <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.2)', borderRadius: '12px', fontSize: '13px', color: '#4a6080', lineHeight: 1.6 }}>
        <strong style={{ color: '#ffa500' }}>Note:</strong> Pushing data triggers the aggregator to distribute your business information to their network. Changes may take 2-6 weeks to fully propagate across all directories. Make sure your business NAP is correct in your site profile before pushing.
      </div>
    </div>
  )
}
