import { createAdminSupabase } from '@/lib/supabase-admin'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

interface ApiAuthResult {
  userId: string
  keyId: string
  scopes: string[]
}

interface ApiAuthError {
  error: string
  status: number
}

export async function authenticateApiKey(request: NextRequest): Promise<ApiAuthResult | ApiAuthError> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header. Use: Bearer sk_live_...', status: 401 }
  }

  const rawKey = authHeader.slice(7)
  if (!rawKey.startsWith('sk_live_')) {
    return { error: 'Invalid API key format', status: 401 }
  }

  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
  const supabase = createAdminSupabase()

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('id, user_id, scopes, expires_at, revoked')
    .eq('key_hash', keyHash)
    .eq('revoked', false)
    .single()

  if (error || !apiKey) {
    return { error: 'Invalid API key', status: 401 }
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { error: 'API key expired', status: 401 }
  }

  // Check enterprise plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', apiKey.user_id)
    .single()

  if (!profile || profile.plan !== 'enterprise') {
    return { error: 'Enterprise plan required for API access', status: 403 }
  }

  // Update last used
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id)

  return {
    userId: apiKey.user_id,
    keyId: apiKey.id,
    scopes: apiKey.scopes || ['read'],
  }
}

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(32).toString('hex')
  const raw = `sk_live_${random}`
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  const prefix = raw.slice(0, 16) + '...'
  return { raw, hash, prefix }
}
