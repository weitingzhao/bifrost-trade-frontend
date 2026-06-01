export function fmtMoney(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function fmtMoneyFull(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function fmtRawPct(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${v.toFixed(1)}%`
}

export function fmtPct2(v: number | null | undefined): string {
  if (v == null) return '—'
  return `${v.toFixed(2)}%`
}

export function fmtNum(v: number | null | undefined): string {
  if (v == null) return '—'
  return String(v)
}

export function fmtFactor(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toFixed(2)
}

export function fmtPnl(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function fmtUsd(v: number | null | undefined): string {
  return fmtMoneyFull(v)
}

export function fmtChicagoTime(unixSec: number | string | null | undefined): string {
  if (unixSec == null || unixSec === '') return '—'
  const n = typeof unixSec === 'string' ? Number(unixSec) : unixSec
  if (!Number.isFinite(n) || n <= 0) return '—'
  return new Date(n * 1000).toLocaleTimeString('en-US', {
    timeZone: 'America/Chicago',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatRangeDate(iso: string): string {
  return iso.replace(/-/g, '/')
}
