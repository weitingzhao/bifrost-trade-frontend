import type { CreateExecutionBody, Execution } from '@/types/positions'
import { closingFillFromNet } from '@/components/positions/quickCloseOffset'
import { executionStrategyInstanceIds } from '@/utils/ledger/ledgerOptHelpers'

export type LedgerJournalMode = 'gap' | 'expired' | 'assigned'

export type LedgerJournalSeed = {
  mode: LedgerJournalMode
  accountId?: string
  symbol?: string
  secType?: 'STK' | 'OPT'
  lockAccount?: boolean
  lockSymbol?: boolean
  expiry?: string
  strike?: number
  optionRight?: string
  netQty?: number
  instanceId?: number
}

export type LedgerJournalDraft = {
  mode: LedgerJournalMode
  accountId: string
  symbol: string
  secType: 'STK' | 'OPT'
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  expiry?: string
  strike?: number
  optionRight?: string
  instanceId?: number
}

export function journalDraftFromSeed(seed: LedgerJournalSeed | undefined): LedgerJournalDraft {
  const mode = seed?.mode ?? 'gap'
  const offset = mode === 'expired' ? closingFillFromNet(seed?.netQty ?? 0) : null
  return {
    mode,
    accountId: seed?.accountId ?? '',
    symbol: seed?.symbol ?? '',
    secType: seed?.secType ?? 'OPT',
    side: offset?.side ?? 'SELL',
    quantity: offset?.quantity ?? 1,
    price: 0,
    expiry: seed?.expiry,
    strike: seed?.strike,
    optionRight: seed?.optionRight,
    instanceId: seed?.instanceId,
  }
}

export function journalCreateBody(
  draft: LedgerJournalDraft,
  nowEpoch: number,
): { ok: true; body: CreateExecutionBody } | { ok: false; error: string } {
  if (draft.mode === 'assigned') {
    return { ok: false, error: 'Assignment writes are disabled until the API accepts transaction_type.' }
  }
  const accountId = draft.accountId.trim()
  const symbol = draft.symbol.trim()
  if (!accountId) return { ok: false, error: 'Account is required.' }
  if (!symbol) return { ok: false, error: 'Contract is required.' }
  const qty = Math.abs(Number(draft.quantity) || 0)
  if (qty <= 0) return { ok: false, error: 'Quantity must be greater than zero.' }
  const price = draft.mode === 'expired' ? 0 : Number(draft.price)
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: 'Price must be a number.' }
  const signedQty = draft.side === 'SELL' ? -qty : qty
  const body: CreateExecutionBody = {
    account_id: accountId,
    time: nowEpoch,
    symbol,
    sec_type: draft.secType,
    side: draft.side,
    quantity: signedQty,
    price,
    source: 'journal_closed',
  }
  if (draft.secType === 'OPT') {
    if (draft.expiry?.trim()) body.expiry = draft.expiry.trim()
    if (draft.strike != null && Number.isFinite(draft.strike)) body.strike = draft.strike
    if (draft.optionRight?.trim()) body.option_right = draft.optionRight.trim()
  }
  if (draft.instanceId != null && Number.isFinite(draft.instanceId) && draft.instanceId > 0) {
    body.strategy_instance_id = draft.instanceId
  }
  return { ok: true, body }
}

export function journalSeedFromStockAdd(accountId: string, symbol: string): LedgerJournalSeed {
  return {
    mode: 'gap',
    accountId,
    symbol,
    secType: 'STK',
    lockAccount: true,
    lockSymbol: true,
  }
}

export function journalSeedFromExpired(exec: Execution, netQty: number): LedgerJournalSeed {
  const ids = executionStrategyInstanceIds(exec)
  const strike = Number(exec.strike)
  return {
    mode: 'expired',
    accountId: exec.account_id,
    symbol: exec.symbol,
    secType: 'OPT',
    lockAccount: true,
    lockSymbol: true,
    expiry: exec.expiry ?? undefined,
    strike: Number.isFinite(strike) ? strike : undefined,
    optionRight: (exec.option_right ?? exec.right) || undefined,
    netQty,
    instanceId: ids.length === 1 ? ids[0] : undefined,
  }
}
