'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function SiteContextBar() {
  const searchParams = useSearchParams()
  const [site, setSite] = useState<any>(null)

  useEffect(() => {
    const siteParam = searchParams.get('site') || searchParams.get('url')
    if (!siteParam) return

    fetch(`/api/sites/resolve?url=${encodeURIComponent(siteParam)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.site) setSite(d.site) })
      .catch(() => {})
  }, [searchParams])

  if (!site) return null

  return (
    <div style={{ background: 'rgba(30,144,255,0.06)', border: '1px solid rgba(30,144,255,0.2)', borderRadius: '10px', padding: '10px 16px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1e90ff', flexShrink: 0 }} />
        <span style={{ fontSize: '12px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>Working on: </span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e90ff' }}>{site.name}</span>
        <span style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace' }}>{site.url}</span>
      </div>
      <a href={'/sites/' + site.id} style={{ fontSize: '12px', color: '#1e90ff', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>Back to site</a>
    </div>
  )
}
