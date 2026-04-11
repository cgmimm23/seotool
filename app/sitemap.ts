import { articles } from '@/lib/seo-articles'

export default function sitemap() {
  const base = 'https://seo.cgmimm.com'

  const staticPages = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${base}/learn`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
  ]

  const articlePages = articles.map(a => ({
    url: `${base}/learn/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...articlePages]
}
