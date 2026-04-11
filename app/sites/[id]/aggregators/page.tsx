'use client'

const AGGREGATORS = [
  { id: 'dataaxle', name: 'Localeze / Data Axle', description: 'One of the original data aggregators. Feeds core data to GPS devices and navigation systems.', coverage: '300+ data consumers', highlights: ['GPS/Navigation', 'Infogroup', 'Acxiom', 'Neustar', 'TomTom', 'Garmin', 'HERE Maps'], pricing: 'Starting at $299/year', signupUrl: 'https://www.data-axle.com', color: '#e85d04' },
]

export default function AggregatorsPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div><h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Citation Aggregators</h2><p style={{ fontSize: '13px', color: '#7a8fa8' }}>Push your business data to hundreds of directories at once</p></div>
      </div>
      <div style={{ background: 'rgba(30,144,255,0.05)', border: '1px solid rgba(30,144,255,0.15)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '13px', color: '#4a6080', lineHeight: 1.6 }}>
        <strong style={{ color: '#1e90ff' }}>What are citation aggregators?</strong> Instead of manually submitting your business to each directory, aggregators push your NAP data to hundreds of sites at once.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '16px' }}>
        {AGGREGATORS.map(agg => (
          <div key={agg.id} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: agg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '14px', color: '#fff', flexShrink: 0 }}>{agg.name[0]}</div>
                  <div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '16px', fontWeight: 700, color: '#0d1b2e' }}>{agg.name}</div>
                    <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{agg.coverage}</div>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#4a6080', lineHeight: 1.5, marginBottom: '10px' }}>{agg.description}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>{agg.highlights.map(h => <span key={h} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#f0f4f8', color: '#4a6080', fontFamily: 'Roboto Mono, monospace' }}>{h}</span>)}</div>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,165,0,0.06)', border: '1px solid rgba(255,165,0,0.15)', fontSize: '13px', color: '#4a6080', lineHeight: 1.5 }}>
                Coming soon — contact us to set up aggregator integrations
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
