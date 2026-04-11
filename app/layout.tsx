import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SEO by CGMIMM — AI-Powered SEO Platform',
  description: 'AI audits your site, writes your fix list, tracks your rankings, and tells you what to do next. 22+ AI-powered SEO tools in one platform. Start free today.',
  metadataBase: new URL('https://seo.cgmimm.com'),
  openGraph: {
    title: 'SEO by CGMIMM — AI-Powered SEO Platform',
    description: 'AI audits your site, writes your fix list, tracks your rankings, and tells you what to do next. 22+ AI-powered SEO tools in one platform.',
    siteName: 'SEO by CGMIMM',
    type: 'website',
    url: 'https://seo.cgmimm.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SEO by CGMIMM — AI-Powered SEO Platform',
    description: 'AI audits your site, writes your fix list, tracks your rankings, and tells you what to do next.',
  },
  keywords: 'SEO tool, AI SEO, site audit, rank tracker, keyword optimization, local SEO, backlink analysis, page speed, schema markup, Google Search Console',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Open+Sans:wght@300;400;500;600&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
