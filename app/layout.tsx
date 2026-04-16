import type { Metadata } from 'next'
import { Montserrat, Open_Sans, Roboto_Mono } from 'next/font/google'
import './globals.css'
import Tracking from '@/app/components/Tracking'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-montserrat',
})
const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-open-sans',
  preload: false,
})
const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-roboto-mono',
  preload: false,
})

export const metadata: Metadata = {
  title: 'AI SEO powered by CGMIMM — AI-Powered SEO Platform',
  description: 'AI audits your site, writes your fix list, tracks your rankings, and tells you exactly what to do next. 22+ AI-powered SEO tools — site audits, rank tracking, backlinks, local SEO, and more. Try it today.',
  metadataBase: new URL('https://seo.cgmimm.com'),
  openGraph: {
    title: 'AI SEO powered by CGMIMM — AI-Powered SEO Platform',
    description: 'AI audits your site, writes your fix list, tracks your rankings, and tells you exactly what to do next. 22+ AI-powered SEO tools in one platform.',
    siteName: 'AI SEO powered by CGMIMM',
    type: 'website',
    url: 'https://seo.cgmimm.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI SEO powered by CGMIMM',
    description: 'AI audits your site, writes your fix list, tracks your rankings, and tells you exactly what to do next.',
  },
  keywords: 'AI SEO, SEO tool, AI site audit, rank tracker, keyword optimization, local SEO, backlink analysis, page speed, schema markup, Google Search Console, CGMIMM',
  robots: 'index, follow',
  alternates: {
    canonical: 'https://seo.cgmimm.com',
  },
  verification: {
    google: 'EWPe6JxtsyyEzPTEZ_XaXPaaB7nLAWzo_FFrw8a8phU',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AI SEO powered by CGMIMM',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://seo.cgmimm.com',
  description: 'AI-powered SEO platform that audits your site, tracks rankings, optimizes pages, and manages local SEO — all automatically.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '59.95',
      priceCurrency: 'USD',
      description: '1 site, all AI tools, daily auto-scans',
      url: 'https://seo.cgmimm.com/#pricing',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '149.00',
      priceCurrency: 'USD',
      description: '5 sites, all AI tools, hourly auto-scans, local SEO suite',
      url: 'https://seo.cgmimm.com/#pricing',
    },
  ],
  provider: {
    '@type': 'Organization',
    name: 'CGMIMM',
    url: 'https://cgmimm.com',
  },
  featureList: 'AI Site Audit, AI Rank Tracker, AI Page Optimizer, AI Site Crawler, Core Web Vitals, Backlink Analysis, Google Search Console, Google Analytics, AI Visibility Check, Local SEO, Review Management, Schema Builder, Google Ads, Bing Webmaster, Image Optimizer, Citation Aggregators, GBP Creator, Rank History',
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CGMIMM',
  url: 'https://cgmimm.com',
  logo: 'https://seo.cgmimm.com/icon.svg',
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'jonathan@cgmimm.com',
    contactType: 'sales',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const GA_ID = 'G-X4K6X3Y0RF'
  return (
    <html lang="en" className={`${montserrat.variable} ${openSans.variable} ${robotoMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <style dangerouslySetInnerHTML={{ __html: `#lc-box{display:none;position:fixed;bottom:96px;right:16px;z-index:999998;width:380px;height:580px;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.2);}#lc-toggle:checked~#lc-box{display:block;}` }} />
      </head>
      <body>
        {children}
        <Tracking />
        <input type="checkbox" id="lc-toggle" style={{ display: 'none' }} />
        <label htmlFor="lc-toggle" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999, width: '58px', height: '58px', borderRadius: '50%', background: '#1a3a5c', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </label>
        <div id="lc-box">
          <iframe src="https://chat.livecustomer.co/bot/bot_0krgrey4" width="100%" height="100%" style={{ border: 'none' }} />
        </div>
      </body>
    </html>
  )
}
