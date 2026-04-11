/**
 * SEO AutoFix for Duda
 *
 * Node.js script that connects to the AI SEO platform,
 * fetches fix instructions, and applies them to a Duda site
 * via the Duda Site Management API.
 *
 * Usage:
 *   node index.js
 *
 * Environment variables (or .env file):
 *   SEO_API_KEY=sk_live_...
 *   SEO_SITE_ID=your-site-id
 *   DUDA_API_USER=your-duda-api-user
 *   DUDA_API_PASS=your-duda-api-pass
 *   DUDA_SITE_NAME=your-duda-site-name
 */

require('dotenv').config()

const SEO_API = 'https://seo.cgmimm.com/api/v1'
const DUDA_API = 'https://api.duda.co/api'

const config = {
  seoApiKey: process.env.SEO_API_KEY,
  seoSiteId: process.env.SEO_SITE_ID,
  dudaUser: process.env.DUDA_API_USER,
  dudaPass: process.env.DUDA_API_PASS,
  dudaSiteName: process.env.DUDA_SITE_NAME,
}

function dudaHeaders() {
  const auth = Buffer.from(`${config.dudaUser}:${config.dudaPass}`).toString('base64')
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  }
}

async function fetchFixes() {
  const res = await fetch(`${SEO_API}/sites/${config.seoSiteId}/fixes?status=pending`, {
    headers: { 'Authorization': `Bearer ${config.seoApiKey}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch fixes: ${res.status}`)
  const data = await res.json()
  return data.fixes || []
}

async function generateFixes() {
  const res = await fetch(`${SEO_API}/sites/${config.seoSiteId}/fixes`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.seoApiKey}` },
  })
  if (!res.ok) throw new Error(`Failed to generate fixes: ${res.status}`)
  const data = await res.json()
  console.log(`Generated ${data.generated} fix instructions`)
}

async function updateFixStatus(fixId, status, errorMessage) {
  await fetch(`${SEO_API}/sites/${config.seoSiteId}/fixes/${fixId}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.seoApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status,
      applied_by: 'duda_plugin',
      plugin_version: '1.0.0',
      error_message: errorMessage || '',
    }),
  })
}

async function getDudaPages() {
  const res = await fetch(`${DUDA_API}/sites/multiscreen/${config.dudaSiteName}/pages`, {
    headers: dudaHeaders(),
  })
  if (!res.ok) throw new Error(`Failed to fetch Duda pages: ${res.status}`)
  return await res.json()
}

async function updateDudaPageSeo(pageName, seoData) {
  const res = await fetch(`${DUDA_API}/sites/multiscreen/${config.dudaSiteName}/pages/${pageName}/seo`, {
    method: 'POST',
    headers: dudaHeaders(),
    body: JSON.stringify(seoData),
  })
  return res.ok
}

async function injectDudaHeadHtml(pageName, html) {
  // Duda allows injecting custom HTML into the page head
  const res = await fetch(`${DUDA_API}/sites/multiscreen/${config.dudaSiteName}/pages/${pageName}`, {
    method: 'POST',
    headers: dudaHeaders(),
    body: JSON.stringify({
      seo: { head_html: html },
    }),
  })
  return res.ok
}

async function applyFix(fix) {
  const fixType = fix.fix_type
  const value = fix.suggested_value

  try {
    // Get all pages to find matching one
    const pages = await getDudaPages()
    const targetPath = new URL(fix.page_url).pathname || '/'

    // Find matching page
    let targetPage = pages.find(p => {
      const pagePath = p.path || '/'
      return pagePath === targetPath || pagePath === targetPath.replace(/\/$/, '')
    })

    if (!targetPage && targetPath === '/') {
      targetPage = pages.find(p => p.path === '/' || p.path === '' || p.page_name === 'home')
    }

    if (!targetPage) {
      console.log(`  Page not found for ${targetPath}, skipping`)
      return 'skipped'
    }

    const pageName = targetPage.page_name

    switch (fixType) {
      case 'meta_title': {
        const ok = await updateDudaPageSeo(pageName, { title: value })
        return ok ? 'applied' : 'failed'
      }

      case 'meta_description': {
        const ok = await updateDudaPageSeo(pageName, { description: value })
        return ok ? 'applied' : 'failed'
      }

      case 'open_graph': {
        let ogData = {}
        try { ogData = JSON.parse(value) } catch { ogData = { 'og:description': value } }
        const ogHtml = Object.entries(ogData)
          .map(([prop, content]) => `<meta property="${prop}" content="${content}">`)
          .join('\n')
        const ok = await injectDudaHeadHtml(pageName, ogHtml)
        return ok ? 'applied' : 'failed'
      }

      case 'schema_markup': {
        const schemaHtml = `<script type="application/ld+json">${value}</script>`
        const ok = await injectDudaHeadHtml(pageName, schemaHtml)
        return ok ? 'applied' : 'failed'
      }

      case 'canonical_tag': {
        const canonHtml = `<link rel="canonical" href="${value}">`
        const ok = await injectDudaHeadHtml(pageName, canonHtml)
        return ok ? 'applied' : 'failed'
      }

      case 'heading_structure':
        return 'manual_review'

      case 'alt_text':
        // Duda API doesn't support direct image alt text updates via REST
        // Flag for manual review
        return 'manual_review'

      default:
        return 'skipped'
    }
  } catch (err) {
    console.error(`  Error applying ${fixType}: ${err.message}`)
    return 'failed'
  }
}

async function republishSite() {
  const res = await fetch(`${DUDA_API}/sites/multiscreen/publish/${config.dudaSiteName}`, {
    method: 'POST',
    headers: dudaHeaders(),
  })
  return res.ok
}

async function main() {
  console.log('SEO AutoFix for Duda v1.0.0')
  console.log('===========================\n')

  // Validate config
  for (const [key, val] of Object.entries(config)) {
    if (!val) {
      console.error(`Missing ${key}. Set it in .env or environment variables.`)
      process.exit(1)
    }
  }

  console.log(`Site: ${config.dudaSiteName}`)
  console.log(`SEO Site ID: ${config.seoSiteId}\n`)

  // Generate fixes from latest audit
  console.log('Generating fixes from latest audit...')
  await generateFixes()

  // Fetch pending fixes
  console.log('Fetching pending fixes...')
  const fixes = await fetchFixes()
  console.log(`Found ${fixes.length} pending fixes\n`)

  if (fixes.length === 0) {
    console.log('Nothing to fix!')
    return
  }

  let applied = 0, failed = 0, skipped = 0, manual = 0

  for (const fix of fixes) {
    console.log(`Applying: ${fix.fix_type} on ${fix.page_url}`)
    const status = await applyFix(fix)

    await updateFixStatus(fix.id, status, status === 'failed' ? 'Duda API error' : '')

    switch (status) {
      case 'applied': applied++; console.log('  ✓ Applied'); break
      case 'failed': failed++; console.log('  ✗ Failed'); break
      case 'skipped': skipped++; console.log('  - Skipped'); break
      case 'manual_review': manual++; console.log('  ⚑ Manual review needed'); break
    }
  }

  // Republish site to make changes live
  if (applied > 0) {
    console.log('\nRepublishing site...')
    const ok = await republishSite()
    console.log(ok ? 'Site republished!' : 'Republish failed — publish manually from Duda dashboard')
  }

  console.log(`\nDone! Applied: ${applied}, Failed: ${failed}, Skipped: ${skipped}, Manual Review: ${manual}`)
}

main().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
