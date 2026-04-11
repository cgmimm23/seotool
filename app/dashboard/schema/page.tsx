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

export default function SchemaPage() {
  const [activeType, setActiveType] = useState<SchemaType>('organization')
  const [copied, setCopied] = useState(false)

  // Organization fields
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

  // Website fields
  const [siteUrl, setSiteUrl] = useState('')
  const [siteName, setSiteName] = useState('')
  const [siteSearch, setSiteSearch] = useState('')

  // WebPage fields
  const [pageUrl, setPageUrl] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [pageDesc, setPageDesc] = useState('')
  const [pageType, setPageType] = useState('WebPage')
  const [pageAuthor, setPageAuthor] = useState('')
  const [pageDate, setPageDate] = useState('')

  // FAQ fields
  const [faqUrl, setFaqUrl] = useState('')
  const [faqs, setFaqs] = useState([{ q: '', a: '' }, { q: '', a: '' }])

  // Product fields
  const [prodName, setProdName] = useState('')
  const [prodDesc, setProdDesc] = useState('')
  const [prodImage, setProdImage] = useState('')
  const [prodUrl, setProdUrl] = useState('')
  const [prodPrice, setProdPrice] = useState('')
  const [prodCurrency, setProdCurrency] = useState('USD')
  const [prodAvail, setProdAvail] = useState('InStock')
  const [prodBrand, setProdBrand] = useState('')

  // Review fields
  const [revItemName, setRevItemName] = useState('')
  const [revItemUrl, setRevItemUrl] = useState('')
  const [revRating, setRevRating] = useState('4.8')
  const [revCount, setRevCount] = useState('124')
  const [revBest, setRevBest] = useState('5')

  function generateSchema(): string {
    switch (activeType) {
      case 'organization':
        return JSON.stringify({
          '@context': 'https://schema.org',
          '@type': orgType,
          name: orgName || 'Your Business Name',
          url: orgUrl || 'https://yoursite.com',
          logo: orgLogo || 'https://yoursite.com/logo.png',
          telephone: orgPhone || '+1-555-555-5555',
          email: orgEmail || 'info@yoursite.com',
          address: {
            '@type': 'PostalAddress',
            streetAddress: orgAddress || '123 Main St',
            addressLocality: orgCity || 'San Antonio',
            addressRegion: orgState || 'TX',
            postalCode: orgZip || '78201',
            addressCountry: 'US',
          },
        }, null, 2)

      case 'website':
        const ws: any = {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: siteName || 'Your Site Name',
          url: siteUrl || 'https://yoursite.com',
        }
        if (siteSearch) {
          ws.potentialAction = {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${siteSearch || 'https://yoursite.com'}?q={search_term_string}` },
            'query-input': 'required name=search_term_string',
          }
        }
        return JSON.stringify(ws, null, 2)

      case 'webpage':
        const wp: any = {
          '@context': 'https://schema.org',
          '@type': pageType,
          headline: pageTitle || 'Page Title',
          description: pageDesc || 'Page description',
          url: pageUrl || 'https://yoursite.com/page',
        }
        if (pageAuthor) wp.author = { '@type': 'Person', name: pageAuthor }
        if (pageDate) wp.datePublished = pageDate
        return JSON.stringify(wp, null, 2)

      case 'faq':
        return JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.filter(f => f.q && f.a).map(f => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }, null, 2)

      case 'product':
        return JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: prodName || 'Product Name',
          description: prodDesc || 'Product description',
          image: prodImage || 'https://yoursite.com/product.jpg',
          url: prodUrl || 'https://yoursite.com/product',
          brand: { '@type': 'Brand', name: prodBrand || 'Brand Name' },
          offers: {
            '@type': 'Offer',
            price: prodPrice || '99.00',
            priceCurrency: prodCurrency,
            availability: `https://schema.org/${prodAvail}`,
            url: prodUrl || 'https://yoursite.com/product',
          },
        }, null, 2)

      case 'review':
        return JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: revItemName || 'Product / Service Name',
          url: revItemUrl || 'https://yoursite.com',
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: revRating || '4.8',
            reviewCount: revCount || '124',
            bestRating: revBest || '5',
            worstRating: '1',
          },
        }, null, 2)

      default:
        return '{}'
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(`<script type="application/ld+json">\n${generateSchema()}\n</script>`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function addFaq() {
    setFaqs([...faqs, { q: '', a: '' }])
  }

  function updateFaq(i: number, field: 'q' | 'a', val: string) {
    setFaqs(faqs.map((f, idx) => idx === i ? { ...f, [field]: val } : f))
  }

  function removeFaq(i: number) {
    setFaqs(faqs.filter((_, idx) => idx !== i))
  }

  const input = (val: string, set: (v: string) => void, placeholder: string, mono = false) => (
    <input
      type="text"
      value={val}
      onChange={e => set(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '8px', padding: '0.5rem 0.8rem', fontSize: '13px',
        color: '#0d1b2e', outline: 'none', fontFamily: mono ? 'Roboto Mono, monospace' : 'Open Sans, sans-serif',
      }}
    />
  )

  const label = (text: string) => (
    <div style={{ fontSize: '11px', color: '#7a8fa8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Roboto Mono, monospace' }}>{text}</div>
  )

  const field = (lbl: string, val: string, set: (v: string) => void, placeholder: string, mono = false) => (
    <div style={{ marginBottom: '0.75rem' }}>
      {label(lbl)}
      {input(val, set, placeholder, mono)}
    </div>
  )

  const cardStyle = { background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Schema Builder</h2>
        <p style={{ fontSize: '13px', color: '#7a8fa8' }}>Generate JSON-LD structured data for your pages</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '12px', alignItems: 'start' }}>

        {/* Type selector */}
        <div>
          <div style={{ fontSize: '11px', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Roboto Mono, monospace', marginBottom: '0.6rem' }}>Schema Type</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {SCHEMA_TYPES.map(t => (
              <div
                key={t.key}
                onClick={() => setActiveType(t.key as SchemaType)}
                style={{
                  padding: '0.6rem 0.9rem', borderRadius: '8px', cursor: 'pointer',
                  border: `1px solid ${activeType === t.key ? 'rgba(30,144,255,0.3)' : 'rgba(0,0,0,0.08)'}`,
                  background: activeType === t.key ? 'rgba(30,144,255,0.06)' : '#fff',
                  fontSize: '12px', color: activeType === t.key ? '#1e90ff' : '#4a6080',
                  fontWeight: activeType === t.key ? 600 : 400,
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span style={{ fontSize: '14px' }}>{t.icon}</span>
                <span style={{ lineHeight: 1.3 }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          {/* Form */}
          <div style={{ ...cardStyle, marginBottom: '12px' }}>

            {activeType === 'organization' && (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  {label('Business Type')}
                  <select value={orgType} onChange={e => setOrgType(e.target.value)} style={{ width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.5rem 0.8rem', fontSize: '13px', color: '#0d1b2e', outline: 'none' }}>
                    <option value="LocalBusiness">Local Business</option>
                    <option value="Organization">Organization</option>
                    <option value="Corporation">Corporation</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="MedicalBusiness">Medical Business</option>
                    <option value="LegalService">Legal Service</option>
                    <option value="HomeAndConstructionBusiness">Home & Construction</option>
                    <option value="AutoDealer">Auto Dealer</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>{field('Business Name', orgName, setOrgName, 'CGMIMM')}</div>
                  <div>{field('Website URL', orgUrl, setOrgUrl, 'https://yoursite.com', true)}</div>
                  <div>{field('Logo URL', orgLogo, setOrgLogo, 'https://yoursite.com/logo.png', true)}</div>
                  <div>{field('Phone', orgPhone, setOrgPhone, '+1-555-555-5555')}</div>
                  <div>{field('Email', orgEmail, setOrgEmail, 'info@yoursite.com')}</div>
                  <div>{field('Street Address', orgAddress, setOrgAddress, '123 Main St')}</div>
                  <div>{field('City', orgCity, setOrgCity, 'San Antonio')}</div>
                  <div>{field('State', orgState, setOrgState, 'TX')}</div>
                  <div>{field('ZIP Code', orgZip, setOrgZip, '78201')}</div>
                </div>
              </>
            )}

            {activeType === 'website' && (
              <>
                {field('Site Name', siteName, setSiteName, 'CGMIMM SEO')}
                {field('Site URL', siteUrl, setSiteUrl, 'https://yoursite.com', true)}
                {field('Search URL (optional)', siteSearch, setSiteSearch, 'https://yoursite.com/search', true)}
                <div style={{ fontSize: '12px', color: '#7a8fa8', marginTop: '-0.5rem' }}>Adding a search URL enables Google Sitelinks Searchbox</div>
              </>
            )}

            {activeType === 'webpage' && (
              <>
                <div style={{ marginBottom: '0.75rem' }}>
                  {label('Page Type')}
                  <select value={pageType} onChange={e => setPageType(e.target.value)} style={{ width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.5rem 0.8rem', fontSize: '13px', color: '#0d1b2e', outline: 'none' }}>
                    <option value="WebPage">WebPage</option>
                    <option value="Article">Article</option>
                    <option value="BlogPosting">Blog Post</option>
                    <option value="NewsArticle">News Article</option>
                    <option value="AboutPage">About Page</option>
                    <option value="ContactPage">Contact Page</option>
                    <option value="ServicePage">Service Page</option>
                  </select>
                </div>
                {field('Page URL', pageUrl, setPageUrl, 'https://yoursite.com/page', true)}
                {field('Title / Headline', pageTitle, setPageTitle, 'Your Page Title')}
                {field('Description', pageDesc, setPageDesc, 'A brief description of this page')}
                {field('Author Name', pageAuthor, setPageAuthor, 'John Smith')}
                {field('Date Published', pageDate, setPageDate, '2025-01-01')}
              </>
            )}

            {activeType === 'faq' && (
              <>
                {field('Page URL', faqUrl, setFaqUrl, 'https://yoursite.com/faq', true)}
                {faqs.map((faq, i) => (
                  <div key={i} style={{ background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px', padding: '0.85rem', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontSize: '11px', color: '#7a8fa8', fontFamily: 'Roboto Mono, monospace', textTransform: 'uppercase' }}>Q{i + 1}</div>
                      {faqs.length > 1 && <button onClick={() => removeFaq(i)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '14px' }}>x</button>}
                    </div>
                    <div style={{ marginBottom: '6px' }}>{input(faq.q, v => updateFaq(i, 'q', v), 'Question')}</div>
                    <textarea
                      value={faq.a}
                      onChange={e => updateFaq(i, 'a', e.target.value)}
                      placeholder="Answer"
                      rows={2}
                      style={{ width: '100%', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.5rem 0.8rem', fontSize: '13px', color: '#0d1b2e', outline: 'none', fontFamily: 'Open Sans, sans-serif', resize: 'vertical' }}
                    />
                  </div>
                ))}
                <button className="btn btn-ghost" onClick={addFaq} style={{ fontSize: '12px' }}>+ Add Question</button>
              </>
            )}

            {activeType === 'product' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>{field('Product Name', prodName, setProdName, 'SEO Audit Tool')}</div>
                <div>{field('Brand', prodBrand, setProdBrand, 'CGMIMM')}</div>
                <div style={{ gridColumn: '1 / -1' }}>{field('Description', prodDesc, setProdDesc, 'AI-powered SEO analysis platform')}</div>
                <div>{field('Product URL', prodUrl, setProdUrl, 'https://yoursite.com/product', true)}</div>
                <div>{field('Image URL', prodImage, setProdImage, 'https://yoursite.com/img.jpg', true)}</div>
                <div>{field('Price', prodPrice, setProdPrice, '79.00')}</div>
                <div>
                  {label('Currency')}
                  <select value={prodCurrency} onChange={e => setProdCurrency(e.target.value)} style={{ width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.5rem 0.8rem', fontSize: '13px', color: '#0d1b2e', outline: 'none' }}>
                    <option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option><option>AUD</option>
                  </select>
                </div>
                <div>
                  {label('Availability')}
                  <select value={prodAvail} onChange={e => setProdAvail(e.target.value)} style={{ width: '100%', background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '0.5rem 0.8rem', fontSize: '13px', color: '#0d1b2e', outline: 'none' }}>
                    <option value="InStock">In Stock</option>
                    <option value="OutOfStock">Out of Stock</option>
                    <option value="PreOrder">Pre-Order</option>
                  </select>
                </div>
              </div>
            )}

            {activeType === 'review' && (
              <>
                {field('Product / Service Name', revItemName, setRevItemName, 'CGMIMM SEO')}
                {field('URL', revItemUrl, setRevItemUrl, 'https://yoursite.com', true)}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>{field('Avg Rating', revRating, setRevRating, '4.8')}</div>
                  <div>{field('Review Count', revCount, setRevCount, '124')}</div>
                  <div>{field('Best Rating', revBest, setRevBest, '5')}</div>
                </div>
              </>
            )}
          </div>

          {/* Generated code */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '14px', fontWeight: 600 }}>Generated JSON-LD</div>
              <button className="btn btn-accent" onClick={copyCode} style={{ fontSize: '12px' }}>
                {copied ? 'OK Copied!' : 'Copy Code'}
              </button>
            </div>
            <pre style={{ background: '#f8f9fb', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '1rem', fontSize: '11px', fontFamily: 'Roboto Mono, monospace', color: '#0d1b2e', overflowX: 'auto', lineHeight: 1.6, maxHeight: '320px', overflowY: 'auto' }}>
              {`<script type="application/ld+json">\n${generateSchema()}\n</script>`}
            </pre>

            {/* Instructions */}
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(30,144,255,0.04)', border: '1px solid rgba(30,144,255,0.12)', borderRadius: '8px' }}>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '13px', fontWeight: 600, marginBottom: '0.5rem', color: '#1e90ff' }}>How to add this to your page</div>
              <div style={{ fontSize: '12px', color: '#4a6080', lineHeight: 1.7 }}>
                <div style={{ marginBottom: '4px' }}>1. Copy the code above using the <strong>Copy Code</strong> button.</div>
                <div style={{ marginBottom: '4px' }}>2. Open your page's HTML and paste it inside the <code style={{ background: '#e4eaf0', padding: '1px 5px', borderRadius: '3px', fontFamily: 'Roboto Mono, monospace' }}>&lt;head&gt;</code> tag.</div>
                <div style={{ marginBottom: '4px' }}>3. If you're using WordPress, use the <strong>Insert Headers and Footers</strong> plugin and paste it in the header section for the specific page.</div>
                <div style={{ marginBottom: '4px' }}>4. If you're using Wix, Squarespace, or Webflow, paste it in the page's custom code / header section.</div>
                <div>5. Validate your schema at <a href="https://search.google.com/test/rich-results" target="_blank" style={{ color: '#1e90ff' }}>Google's Rich Results Test</a></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
