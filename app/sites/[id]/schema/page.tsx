'use client'

import { useState } from 'react'

type SchemaType = 'organization' | 'website' | 'webpage' | 'faq' | 'product' | 'review'

const SCHEMA_TYPES = [
  { key: 'organization', label: 'Organization / Local Business', icon: 'Org' },
  { key: 'website', label: 'Website / Sitelinks', icon: 'Web' },
  { key: 'webpage', label: 'WebPage / Article', icon: 'Pg' },
  { key: 'faq', label: 'FAQ Page', icon: 'FAQ' },
  { key: 'product', label: 'Product', icon: 'Prd' },
  { key: 'review', label: 'Review / Rating', icon: 'Rev' },
]

export default function SchemaPage({ params }: { params: { id: string } }) {
  const [activeType, setActiveType] = useState<SchemaType>('organization')
  const [copied, setCopied] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [orgUrl, setOrgUrl] = useState('')
  const [orgLogo, setOrgLogo] = useState('')
  const [orgPhone, setOrgPhone] = useState('')
  const [orgEmail, setOrgEmail] = useState('')
  const [orgAddress, setOrgAddress] = useState('')
  const [orgCity, setOrgCity] = useState('')
  const [orgState, setOrgState] = useState('')
  const [orgZip, setOrgZip] = useState('')
  const [orgType, setOrgType] = useState('LocalBusiness')
  const [siteUrl, setSiteUrl] = useState('')
  const [siteName, setSiteName] = useState('')
  const [pageUrl, setPageUrl] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [pageDesc, setPageDesc] = useState('')
  const [pageType, setPageType] = useState('WebPage')
  const [pageAuthor, setPageAuthor] = useState('')
  const [pageDate, setPageDate] = useState('')
  const [faqs, setFaqs] = useState([{ q: '', a: '' }, { q: '', a: '' }])
  const [prodName, setProdName] = useState('')
  const [prodDesc, setProdDesc] = useState('')
  const [prodUrl, setProdUrl] = useState('')
  const [prodPrice, setProdPrice] = useState('')
  const [prodCurrency, setProdCurrency] = useState('USD')
  const [prodAvail, setProdAvail] = useState('InStock')
  const [prodBrand, setProdBrand] = useState('')
  const [revItemName, setRevItemName] = useState('')
  const [revItemUrl, setRevItemUrl] = useState('')
  const [revRating, setRevRating] = useState('4.8')
  const [revCount, setRevCount] = useState('124')

  function generateSchema(): string {
    switch (activeType) {
      case 'organization': return JSON.stringify({ '@context': 'https://schema.org', '@type': orgType, name: orgName || 'Your Business Name', url: orgUrl || 'https://yoursite.com', logo: orgLogo || 'https://yoursite.com/logo.png', telephone: orgPhone || '+1-555-555-5555', email: orgEmail || 'info@yoursite.com', address: { '@type': 'PostalAddress', streetAddress: orgAddress || '123 Main St', addressLocality: orgCity || 'San Antonio', addressRegion: orgState || 'TX', postalCode: orgZip || '78201', addressCountry: 'US' } }, null, 2)
      case 'website': return JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: siteName || 'Your Site Name', url: siteUrl || 'https://yoursite.com' }, null, 2)
      case 'webpage': return JSON.stringify({ '@context': 'https://schema.org', '@type': pageType, headline: pageTitle || 'Page Title', description: pageDesc || 'Page description', url: pageUrl || 'https://yoursite.com/page', ...(pageAuthor ? { author: { '@type': 'Person', name: pageAuthor } } : {}), ...(pageDate ? { datePublished: pageDate } : {}) }, null, 2)
      case 'faq': return JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.filter(f => f.q && f.a).map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }, null, 2)
      case 'product': return JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: prodName || 'Product Name', description: prodDesc || 'Product description', brand: { '@type': 'Brand', name: prodBrand || 'Brand' }, offers: { '@type': 'Offer', price: prodPrice || '99.00', priceCurrency: prodCurrency, availability: `https://schema.org/${prodAvail}`, url: prodUrl || 'https://yoursite.com/product' } }, null, 2)
      case 'review': return JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: revItemName || 'Product Name', url: revItemUrl || 'https://yoursite.com', aggregateRating: { '@type': 'AggregateRating', ratingValue: revRating, reviewCount: revCount, bestRating: '5' } }, null, 2)
      default: return '{}'
    }
  }

  function copyCode() {
    const code = `<script type="application/ld+json">\n${generateSchema()}\n</script>`
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cardStyle = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }
  const label = (t: string) => <label style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', display: 'block', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }}>{t}</label>
  const inputStyle = { width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.5rem 0.8rem', fontSize: '13px', color: '#0d1b2e', outline: 'none', fontFamily: 'Open Sans, sans-serif', boxSizing: 'border-box' as const }
  const field = (l: string, v: string, s: (v: string) => void, ph: string) => <div style={{ marginBottom: '0.75rem' }}>{label(l)}<input type="text" style={inputStyle} placeholder={ph} value={v} onChange={e => s(e.target.value)} /></div>

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}><h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Schema Builder</h2><p style={{ fontSize: '13px', color: '#7a8fa8' }}>Generate JSON-LD structured data for Google rich results</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '12px', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace', marginBottom: '0.6rem' }}>Schema Type</div>
          {SCHEMA_TYPES.map(t => (
            <div key={t.key} onClick={() => setActiveType(t.key as SchemaType)} style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '4px', border: `1px solid ${activeType === t.key ? 'rgba(30,144,255,0.3)' : 'rgba(0,0,0,0.08)'}`, background: activeType === t.key ? 'rgba(30,144,255,0.06)' : '#fff' }}>
              <div style={{ fontSize: '13px', color: activeType === t.key ? '#1e90ff' : '#4a6080' }}>{t.label}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={cardStyle}>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '1rem' }}>Configure</div>
            {activeType === 'organization' && (
              <>
                <div style={{ marginBottom: '0.75rem' }}>{label('Business Type')}<select value={orgType} onChange={e => setOrgType(e.target.value)} style={{ ...inputStyle }}><option value="LocalBusiness">Local Business</option><option value="Organization">Organization</option><option value="Corporation">Corporation</option><option value="Restaurant">Restaurant</option></select></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>{field('Business Name', orgName, setOrgName, 'CGMIMM')}</div>
                  <div>{field('Website URL', orgUrl, setOrgUrl, 'https://yoursite.com')}</div>
                  <div>{field('Phone', orgPhone, setOrgPhone, '+1-555-555-5555')}</div>
                  <div>{field('Email', orgEmail, setOrgEmail, 'info@yoursite.com')}</div>
                  <div>{field('Street Address', orgAddress, setOrgAddress, '123 Main St')}</div>
                  <div>{field('City', orgCity, setOrgCity, 'San Antonio')}</div>
                  <div>{field('State', orgState, setOrgState, 'TX')}</div>
                  <div>{field('ZIP Code', orgZip, setOrgZip, '78201')}</div>
                </div>
              </>
            )}
            {activeType === 'website' && (<>{field('Site Name', siteName, setSiteName, 'CGMIMM SEO')}{field('Site URL', siteUrl, setSiteUrl, 'https://yoursite.com')}</>)}
            {activeType === 'webpage' && (<>{field('Page URL', pageUrl, setPageUrl, 'https://yoursite.com/page')}{field('Title / Headline', pageTitle, setPageTitle, 'Your Page Title')}{field('Description', pageDesc, setPageDesc, 'A brief description')}{field('Author Name', pageAuthor, setPageAuthor, 'John Smith')}{field('Date Published', pageDate, setPageDate, '2025-01-01')}</>)}
            {activeType === 'faq' && (
              <>
                {faqs.map((faq, i) => (
                  <div key={i} style={{ background: '#f8f9fb', borderRadius: '8px', padding: '0.85rem', marginBottom: '8px' }}>
                    <div style={{ marginBottom: '6px' }}><input type="text" style={inputStyle} placeholder="Question" value={faq.q} onChange={e => { const f = [...faqs]; f[i].q = e.target.value; setFaqs(f) }} /></div>
                    <textarea value={faq.a} onChange={e => { const f = [...faqs]; f[i].a = e.target.value; setFaqs(f) }} placeholder="Answer" rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
                  </div>
                ))}
                <button className="btn btn-ghost" onClick={() => setFaqs([...faqs, { q: '', a: '' }])} style={{ fontSize: '12px' }}>+ Add Question</button>
              </>
            )}
            {activeType === 'product' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>{field('Product Name', prodName, setProdName, 'SEO Audit Tool')}</div>
                <div>{field('Brand', prodBrand, setProdBrand, 'CGMIMM')}</div>
                <div style={{ gridColumn: '1 / -1' }}>{field('Description', prodDesc, setProdDesc, 'AI-powered SEO analysis')}</div>
                <div>{field('Product URL', prodUrl, setProdUrl, 'https://yoursite.com/product')}</div>
                <div>{field('Price', prodPrice, setProdPrice, '79.00')}</div>
              </div>
            )}
            {activeType === 'review' && (<>{field('Product / Service Name', revItemName, setRevItemName, 'CGMIMM SEO')}{field('URL', revItemUrl, setRevItemUrl, 'https://yoursite.com')}<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}><div>{field('Avg Rating', revRating, setRevRating, '4.8')}</div><div>{field('Review Count', revCount, setRevCount, '124')}</div></div></>)}
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600 }}>Generated JSON-LD</div>
              <button className="btn btn-accent" onClick={copyCode} style={{ fontSize: '12px' }}>{copied ? '✓ Copied!' : 'Copy Code'}</button>
            </div>
            <pre style={{ background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '1rem', fontSize: '11px', fontFamily: 'Roboto Mono, monospace', color: '#0d1b2e', overflowX: 'auto', lineHeight: 1.6, maxHeight: '320px', overflowY: 'auto' }}>
              {`<script type="application/ld+json">\n${generateSchema()}\n</script>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
