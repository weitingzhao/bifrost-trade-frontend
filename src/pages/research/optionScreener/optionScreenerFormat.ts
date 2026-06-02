export function fmtPct(v: number | null | undefined): string {
  return v != null ? `${(v * 100).toFixed(1)}%` : '—'
}

export function fmtPrice(v: number | null | undefined): string {
  return v != null ? `$${v.toFixed(2)}` : '—'
}

export function fmtGreek(v: number | null | undefined): string {
  return v != null ? v.toFixed(3) : '—'
}

/** Map numeric best score to letter rating for header badges. */
export function bestScoreRating(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 80) return 'A'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}
