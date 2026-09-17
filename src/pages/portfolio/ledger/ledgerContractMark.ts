import { fmtIsoDateToken } from '@/lib/format'

export function fmtExpiryOccToken(expiry: string | null | undefined): string {
  if (expiry == null || String(expiry).trim() === '') return '—'
  const digits = String(expiry).replace(/\D/g, '')
  if (digits.length >= 8) {
    return fmtIsoDateToken(`${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`)
  }
  return String(expiry).trim()
}

export function ledgerContractDisplay(g: {
  symbol?: string | null
  expiry?: string | null
  contract_key?: string | null
}): { mark: string; occ: string } {
  const occ = (g.contract_key ?? '').trim()
  const underlying =
    (g.symbol ?? '').trim().split(/\s+/)[0] || occ.split('|')[0] || '—'
  const expiry = fmtExpiryOccToken(g.expiry)
  const mark = expiry === '—' ? underlying : `${underlying} ${expiry}`
  return { mark, occ: occ || mark }
}
