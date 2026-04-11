'use client'

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
  },
]

export default function AggregatorsPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Citation Aggregators</h2>
          <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Push your business data to hundreds of directories at once</p>
        </div>
      </div>

      {/* What are aggregators */}
      <div style={{ background: 'rgba(30,144,255,0.05)', border: '1px solid rgba(30,144,255,0.15)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '13px', color: '#4a6080', lineHeight: 1.6 }}>
        <strong style={{ color: '#1e90ff' }}>What are citation aggregators?</strong> Instead of manually submitting your business to each directory, aggregators push your NAP data (Name, Address, Phone) to hundreds of sites at once. Connecting even one aggregator can create or fix dozens of citations simultaneously, which is a major local SEO ranking factor.
      </div>

      {/* Aggregator cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '16px' }}>
        {AGGREGATORS.map(agg => (
          <div key={agg.id} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', overflow: 'hidden' }}>

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

            {/* Push action */}
            <div style={{ padding: '1.25rem' }}>
              <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,165,0,0.06)', border: '1px solid rgba(255,165,0,0.15)', fontSize: '13px', color: '#4a6080', lineHeight: 1.5 }}>
                Coming soon — contact us to set up aggregator integrations
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Note about push */}
      <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.2)', borderRadius: '12px', fontSize: '13px', color: '#4a6080', lineHeight: 1.6 }}>
        <strong style={{ color: '#ffa500' }}>Note:</strong> Pushing data triggers the aggregator to distribute your business information to their network. Changes may take 2-6 weeks to fully propagate across all directories. Make sure your business NAP is correct in your site profile before pushing.
      </div>
    </div>
  )
}
