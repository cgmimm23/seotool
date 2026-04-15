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
  return (
    <html lang="en" className={`${montserrat.variable} ${openSans.variable} ${robotoMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body>
        {children}
        <Tracking />
      </body>
    </html>
  )
}
