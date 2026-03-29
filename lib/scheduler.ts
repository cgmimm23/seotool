export type Plan = 'free' | 'starter' | 'pro' | 'agency'

// How often each plan gets auto-scanned
const SCAN_INTERVALS: Record<Plan, number | null> = {
  free: null,          // manual only
  starter: 7 * 24,    // weekly (hours)
  pro: 24,            // daily
  agency: 1,          // hourly
}

export function getNextScanTime(plan: Plan): Date | null {
  const hours = SCAN_INTERVALS[plan]
  if (!hours) return null
  const next = new Date()
  next.setHours(next.getHours() + hours)
  return next
}

export function isDueForScan(
  plan: Plan,
  lastScannedAt: Date | null
): boolean {
  const hours = SCAN_INTERVALS[plan]
  if (!hours || !lastScannedAt) return false
  const now = new Date()
  const diffHours =
    (now.getTime() - lastScannedAt.getTime()) / (1000 * 60 * 60)
  return diffHours >= hours
}

export function planLabel(plan: Plan): string {
  const labels: Record<Plan, string> = {
    free: 'Free — manual scans',
    starter: 'Starter — weekly auto-scan',
    pro: 'Pro — daily auto-scan',
    agency: 'Agency — hourly auto-scan',
  }
  return labels[plan]
}
