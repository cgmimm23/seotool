import { createAdminSupabase } from '@/lib/supabase-admin'

interface AuditCheck {
  status: string
  category: string
  title: string
  detail: string
}

interface FixInstruction {
  page_url: string
  fix_type: string
  priority: string
  target: any
  current_value: string | null
  suggested_value: string
}

export async function generateFixes(siteId: string, auditId: string, siteUrl: string, checks: AuditCheck[]): Promise<FixInstruction[]> {
  const failingChecks = checks.filter(c => c.status === 'fail' || c.status === 'warn')
  if (failingChecks.length === 0) return []

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return []

  const prompt = `You are an SEO expert. Based on these failing SEO audit checks for ${siteUrl}, generate specific, actionable fix instructions.

Failing checks:
${failingChecks.map(c => `- [${c.status.toUpperCase()}] ${c.title}: ${c.detail}`).join('\n')}

For each issue, generate a JSON fix instruction. The fix_type must be one of: meta_title, meta_description, schema_markup, alt_text, canonical_tag, open_graph, heading_structure, robots_meta.

For meta_title and meta_description: write the actual optimized content.
For schema_markup: write the actual JSON-LD object.
For open_graph: write the og:title, og:description values.
For canonical_tag: suggest the canonical URL.
For heading_structure: describe the change needed (this will be flagged for manual review).
For alt_text: describe what alt text should say.

Return ONLY a JSON array of objects with these fields: fix_type, priority (high/medium/low), suggested_value, detail.
No explanation, just the JSON array.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return []

    const data = await res.json()
    const text = data.content?.[0]?.text?.trim() || ''

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const rawFixes = JSON.parse(jsonMatch[0])

    return rawFixes.map((f: any) => ({
      page_url: siteUrl,
      fix_type: f.fix_type || 'meta_description',
      priority: f.priority || 'medium',
      target: { page_url: siteUrl },
      current_value: null,
      suggested_value: typeof f.suggested_value === 'object' ? JSON.stringify(f.suggested_value) : (f.suggested_value || f.detail || ''),
    }))
  } catch {
    return []
  }
}

export async function generateAndStoreFixes(siteId: string, auditId: string, siteUrl: string): Promise<number> {
  const supabase = createAdminSupabase()

  // Get audit checks
  const { data: audit } = await supabase
    .from('audit_reports')
    .select('checks, url')
    .eq('id', auditId)
    .single()

  if (!audit?.checks) return 0

  const fixes = await generateFixes(siteId, auditId, audit.url || siteUrl, audit.checks)
  if (fixes.length === 0) return 0

  // Store fixes
  const rows = fixes.map(f => ({
    site_id: siteId,
    audit_id: auditId,
    ...f,
  }))

  const { error } = await supabase.from('fix_instructions').insert(rows)
  if (error) return 0

  return fixes.length
}
