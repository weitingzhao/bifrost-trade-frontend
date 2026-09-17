import { fmtIsoDateToken } from '@/lib/format'

export function fmtExpiryOccToken(expiry: string | null | undefined): string {
  if (expiry == null || String(expiry).trim() === '') return '—'
  const digits = String(expiry).replace(/\D/g, '')
  if (digits.length >= 8) {
    return fmtIsoDateToken(`${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`)
  }
  return String(expiry).trim()
}

function strikeToken(strike: unknown): string {
  const n = Number(strike)
  if (!Number.isFinite(n) || n <= 0) return ''
  return String(Number(n.toFixed(4)))
}

/**
 * The option contract token (§14.4.2): `SYM DDMMMYY strike+C/P`, e.g. `NVDA 20NOV26 245C`.
 * A stock or a combo has no strike and right, so it stays `SYM` (plus expiry if it has one).
 * The stored key goes to `occ`, for hover only.
 */
export function ledgerContractDisplay(g: {
  symbol?: string | null
  expiry?: string | null
  contract_key?: string | null
  strike?: number | string | null
  option_right?: string | null
  right?: string | null
}): { mark: string; occ: string } {
  const occ = (g.contract_key ?? '').trim()
  const parts = occ.split('|')
  const underlying = (g.symbol ?? '').trim().split(/\s+/)[0] || parts[0] || '—'
  const expiry = fmtExpiryOccToken(g.expiry)
  const strike = strikeToken(g.strike) || strikeToken(parts[3])
  const right = (g.option_right || g.right || parts[4] || '').trim().toUpperCase().slice(0, 1)
  const leg = strike && (right === 'C' || right === 'P') ? `${strike}${right}` : ''
  const mark = [underlying, expiry === '—' ? '' : expiry, leg].filter(Boolean).join(' ')
  return { mark, occ: occ || mark }
}
