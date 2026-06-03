import { cn } from '@/lib/utils'

export function fmtTs(iso: string | null | undefined): string {
  if (!iso) return '—'
  if (iso.length >= 16) return iso.slice(0, 16).replace('T', ' ')
  return iso
}

export function fmtAgeSeconds(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '—'
  const s = Math.max(0, Math.floor(sec))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  const h = Math.floor(s / 3600)
  const d = Math.floor(h / 24)
  const hr = h % 24
  const min = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${hr}h ago`
  if (h > 0) return `${h}h ${min}m ago`
  return `${m}m ago`
}

export function completenessPctClass(pct: number): string {
  if (pct >= 97) return 'text-muted-foreground'
  if (pct >= 85) return 'text-amber-600 dark:text-amber-500'
  return 'text-destructive'
}

export function gapNumClass(gap: number | null | undefined): string {
  if (gap == null) return ''
  return gap === 0 ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-500'
}

export function covPctClass(pct: number | null | undefined): string {
  if (pct == null) return ''
  return pct === 100 ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-500'
}

export function matrixCellClass(...parts: (string | false | undefined)[]): string {
  return cn('whitespace-nowrap font-mono text-xs tabular-nums', ...parts)
}

export type RefGapLike = {
  ok?: boolean
  massive_total?: number | null
  gap?: number | null
  coverage_pct?: number | null
}

export function formatMassiveRefCell(g: RefGapLike | undefined): string {
  if (!g?.ok || g.massive_total == null) return '—'
  return g.massive_total.toLocaleString()
}

export function formatGapCell(g: RefGapLike | undefined): string {
  if (!g?.ok || g.gap == null) return '—'
  const n = g.gap
  return n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString()
}

export function formatCovPctCell(g: RefGapLike | undefined): string {
  if (!g?.ok || g.coverage_pct == null) return '—'
  return `${g.coverage_pct}%`
}

export function formatGapPairCell(
  left: string,
  right: string | number | null | undefined,
): string {
  const r =
    right == null || right === ''
      ? '—'
      : typeof right === 'number'
        ? right.toLocaleString()
        : right
  return `${left} / ${r}`
}
