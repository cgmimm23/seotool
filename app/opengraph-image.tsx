import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'AI SEO powered by CGMIMM — AI-Powered SEO Platform'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2367a0 0%, #1a4d7a 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(104,204,209,0.1)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 150, height: 150, borderRadius: '50%', background: 'rgba(104,204,209,0.08)', display: 'flex' }} />

        {/* AI badge */}
        <div
          style={{
            padding: '8px 24px',
            borderRadius: 50,
            background: 'rgba(104,204,209,0.2)',
            color: '#68ccd1',
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 20,
            letterSpacing: 2,
            display: 'flex',
          }}
        >
          AI-POWERED SEO PLATFORM
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          AI SEO
          <span style={{ color: '#68ccd1', fontSize: 36 }}>powered by</span>
          CGMIMM
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 500,
            marginBottom: 24,
            display: 'flex',
          }}
        >
          AI audits your site, writes your fix list, and tracks your rankings
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 12 }}>
          {['Site Audits', 'Rank Tracking', 'Page Optimizer', 'Backlinks', 'Local SEO'].map(f => (
            <div
              key={f}
              style={{
                padding: '6px 16px',
                borderRadius: 50,
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
              }}
            >
              {f}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            fontSize: 16,
            color: 'rgba(255,255,255,0.4)',
            display: 'flex',
          }}
        >
          seo.cgmimm.com
        </div>
      </div>
    ),
    { ...size }
  )
}
