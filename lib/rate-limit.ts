const rateMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, maxRequests: number = 60, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count }
}

// Clean up old entries periodically
export function cleanupRateLimit() {
  const now = Date.now()
  rateMap.forEach((entry, key) => {
    if (now > entry.resetAt) rateMap.delete(key)
  })
}
