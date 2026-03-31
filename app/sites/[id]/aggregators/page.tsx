'use client'

import { useState, useEffect } from 'react'

const AGGREGATORS = [
  { id: 'yext', name: 'Yext', description: 'Pushes your business data to 200+ directories, maps, apps, and search engines simultaneously.', coverage: '200+ directories', highlights: ['Google', 'Apple Maps', 'Bing', 'Yelp', 'Facebook', 'Amazon Alexa', 'Siri', 'TripAdvisor'], pricing: 'Starting at $199/year per location', signupUrl: 'https://www.yext.com', color: '#0a3dff', keyField: 'YEXT_API_KEY', keyPlaceholder: 'yext_api_key_...' },
  { id: 'brightlocal', name: 'BrightLocal', description: 'Citation building, tracking, and cleanup tool. Great for agencies managing multiple clients.', coverage: '1,400+ directories', highlights: ['Yelp', 'YellowPages', 'Foursquare', 'Citysearch', 'Manta', 'Superpages', 'MapQuest'], pricing: 'Starting at $29/month', signupUrl: 'https://www.brightlocal.com', color: '#00b386', keyField: 'BRIGHTLOCAL_API_KEY', keyPlaceholder: 'bl_api_key_...' },
  { id: 'uberall', name: 'Uberall', description: 'Enterprise-grade location marketing platform. Strong in Europe and international markets.', coverage: '125+ directories', highlights: ['Google', 'Facebook', 'Apple Maps', 'HERE Maps', 'TomTom', 'Navmii', 'Cylex'], pricing: 'Custom enterprise pricing', signupUrl: 'https://uberall.com', color: '#6b4fbb', keyField: 'UBERALL_API_KEY', keyPlaceholder: 'uberall_key_...' },
  { id: 'dataaxle', name: 'Localeze / Data Axle', description: 'One of the original data aggregators. Feeds core data to GPS devices and navigation systems.', coverage: '300+ data consumers', highlights: ['GPS/Navigation', 'Infogroup', 'Acxiom', 'Neustar', 'TomTom', 'Garmin', 'HERE Maps'], pricing: 'Starting at $299/year', signupUrl: 'https://www.data-axle.com', color: '#e85d04', keyField: 'DATAAXLE_API_KEY', keyPlaceholder: 'dax_api_key_...' },
]

export default function AggregatorsPage({ params }: { params: { id: string } }) {
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [pushed, setPushed] = useState<Record<string, boolean>>({})
  const [pushing, setPushing] = useState<string | null>(null)

  useEffect(() => {
    const loaded: Record<string, string> = {}
    const saved: Record<string, boolean> = {}
    AGGREGATORS.forEach(a => {
      const k = localStorage.getItem(`riq_${a.id}_key`) || ''
      loaded[a.id] = k
      saved[a.id] = !!k
    })
    setKeys(loaded)
    setSavedKeys(saved)
  }, [])

  function saveKey(aggregatorId: string) {
    setSaving(aggregatorId)
    const key = keys[aggregatorId]
    if (key) { localStorage.setItem(`riq_${aggregatorId}_key`, key); setSavedKeys(prev => ({ ...prev, [aggregatorId]: true })) }
    else { localStorage.removeItem(`riq_${aggregatorId}_key`); setSavedKeys(prev => ({ ...prev, [aggregatorId]: false })) }
    setTimeout(() => setSaving(null), 1000)
  }

  function disconnectKey(aggregatorId: string) {
    localStorage.removeItem(`riq_${aggregatorId}_key`)
    setKeys(prev => ({ ...prev, [aggregatorId]: '' }))
    setSavedKeys(prev => ({ ...prev, [aggregatorId]: false }))
  }

  async function pushData(aggregatorId: string) {
    if (!savedKeys[aggregatorId]) { alert(`Connect your ${AGGREGATORS.find(a => a.id === aggregatorId)?.name} API key first`); return }
    setPushing(aggregatorId)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setPushed(prev => ({ ...prev, [aggregatorId]: true }))
    setPushing(null)
  }

  const connectedCount = Object.values(savedKeys).filter(Boolean).length
  const inputStyle = { background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.5rem 0.85rem', fontSize: '12px', color: '#0d1b2e', outline: 'none', fontFamily: 'Roboto Mono, monospace', flex: 1 }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div><h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Citation Aggregators</h2><p style={{ fontSize: '13px', color: '#7a8fa8' }}>Push your business data to hundreds of directories at once</p></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{connectedCount} of {AGGREGATORS.length} connected</div>
          <div style={{ display: 'flex', gap: '4px' }}>{AGGREGATORS.map(a => <div key={a.id} style={{ width: '8px', height: '8px', borderRadius: '50%', background: savedKeys[a.id] ? '#00d084' : '#e4eaf0' }} />)}</div>
        </div>
      </div>
      <div style={{ background: 'rgba(30,144,255,0.05)', border: '1px solid rgba(30,144,255,0.15)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '13px', color: '#4a6080', lineHeight: 1.6 }}>
        <strong style={{ color: '#1e90ff' }}>What are citation aggregators?</strong> Instead of manually submitting your business to each directory, aggregators push your NAP data to hundreds of sites at once.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '16px' }}>
        {AGGREGATORS.map(agg => {
          const isConnected = savedKeys[agg.id]
          const isPushing = pushing === agg.id
          const hasPushed = pushed[agg.id]
          return (
            <div key={agg.id} style={{ background: '#fff', border: `1px solid ${isConnected ? 'rgba(0,208,132,0.3)' : 'rgba(0,0,0,0.08)'}`, borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: agg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '14px', color: '#fff', flexShrink: 0 }}>{agg.name[0]}</div>
                    <div>
                      <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, color: '#0d1b2e' }}>{agg.name}</div>
                      <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{agg.coverage}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: isConnected ? 'rgba(0,208,132,0.1)' : '#f0f4f8', color: isConnected ? '#00d084' : '#7a8fa8', fontFamily: 'Roboto Mono, monospace', fontWeight: isConnected ? 600 : 400 }}>{isConnected ? 'Connected' : 'Not connected'}</span>
                </div>
                <p style={{ fontSize: '13px', color: '#4a6080', lineHeight: 1.5, marginBottom: '10px' }}>{agg.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>{agg.highlights.map(h => <span key={h} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#f0f4f8', color: '#4a6080', fontFamily: 'Roboto Mono, monospace' }}>{h}</span>)}</div>
              </div>
              <div style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }}>API Key</div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  <input type="password" style={inputStyle} placeholder={agg.keyPlaceholder} value={keys[agg.id] || ''} onChange={e => setKeys(prev => ({ ...prev, [agg.id]: e.target.value }))} />
                  <button onClick={() => saveKey(agg.id)} style={{ padding: '0 12px', background: '#1e90ff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#fff', fontFamily: 'Open Sans, sans-serif', fontWeight: 600 }}>{saving === agg.id ? 'Saved!' : 'Save'}</button>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => pushData(agg.id)} disabled={!isConnected || isPushing} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: isConnected ? (hasPushed ? 'rgba(0,208,132,0.1)' : '#1e90ff') : '#f0f4f8', color: isConnected ? (hasPushed ? '#00d084' : '#fff') : '#7a8fa8', fontSize: '13px', fontWeight: 600, cursor: isConnected ? 'pointer' : 'not-allowed', fontFamily: 'Open Sans, sans-serif' }}>
                    {isPushing ? 'Pushing data...' : hasPushed ? 'Data pushed!' : 'Push Business Data'}
                  </button>
                  {isConnected && <button onClick={() => disconnectKey(agg.id)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,68,68,0.2)', background: 'rgba(255,68,68,0.05)', color: '#ff4444', fontSize: '12px', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>Disconnect</button>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
