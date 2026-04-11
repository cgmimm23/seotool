import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'SEO by CGMIMM — AI-Powered SEO Platform'
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
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: '#68ccd1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 24,
          }}
        >
          SEO
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 8,
          }}
        >
          SEO by CGMIMM
        </div>
        <div
          style={{
            fontSize: 24,
            color: '#68ccd1',
            fontWeight: 600,
          }}
        >
          AI-Powered SEO Platform — Audit, Rank, Grow
        </div>
        <div
          style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.6)',
            marginTop: 16,
          }}
        >
          seo.cgmimm.com
        </div>
      </div>
    ),
    { ...size }
  )
}
