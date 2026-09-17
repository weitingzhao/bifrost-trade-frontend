import type { CreateExecutionBody, Execution } from '@/types/positions'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { closingFillFromNet, signedFillQty } from '@/components/positions/quickCloseOffset'
import { executionStrategyInstanceIds } from '@/utils/ledger/ledgerOptHelpers'

export type LedgerJournalMode = 'gap' | 'expired' | 'assigned'

/**
 * Where a journal entry on the Journal face starts: always an option contract
 * the page already holds fills for.
 *
 * The face writes the contract's own `contract_key`. Without it the API builds
 * one (`…|50|C`) that is not the key Flex and TWS rows carry (`…|50.0|C`), so the
 * new row lands in a group of its own and the position it meant to close stays
 * open. A stock row, or an option the page has no fills for, goes through the
 * full execution form instead, which has every field.
 */
export type LedgerJournalSeed = {
  mode: LedgerJournalMode
  accountId: string
  symbol: string
  contractKey: string
  expiry?: string
  strike?: number
  optionRight?: string
  netQty?: number
  instanceId?: number
  opportunityId?: number
}

export type LedgerJournalDraft = {
  mode: LedgerJournalMode
  accountId: string
  symbol: string
  contractKey: string
  side: 'BUY' | 'SELL'
  quantity: number
  price: number
  expiry?: string
  strike?: number
  optionRight?: string
  instanceId?: number
  opportunityId?: number
}

export function journalDraftFromSeed(seed: LedgerJournalSeed): LedgerJournalDraft {
  const offset = seed.mode === 'expired' ? closingFillFromNet(seed.netQty ?? 0) : null
  return {
    mode: seed.mode,
    accountId: seed.accountId,
    symbol: seed.symbol,
    contractKey: seed.contractKey,
    side: offset?.side ?? 'SELL',
    quantity: offset?.quantity ?? 1,
    price: 0,
    expiry: seed.expiry,
    strike: seed.strike,
    optionRight: seed.optionRight,
    instanceId: seed.instanceId,
    opportunityId: seed.opportunityId,
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
  const contractKey = draft.contractKey.trim()
  if (!accountId) return { ok: false, error: 'Account is required.' }
  if (!symbol || !contractKey) {
    return { ok: false, error: 'Open the journal from a contract row, or use the full form for a new contract.' }
  }
  const qty = Math.abs(Number(draft.quantity) || 0)
  if (qty <= 0) return { ok: false, error: 'Quantity must be greater than zero.' }
  const price = draft.mode === 'expired' ? 0 : Number(draft.price)
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: 'Price must be a number.' }
  const body: CreateExecutionBody = {
    account_id: accountId,
    time: nowEpoch,
    symbol,
    sec_type: 'OPT',
    side: draft.side,
    quantity: draft.side === 'SELL' ? -qty : qty,
    price,
    source: 'journal_closed',
    contract_key: contractKey,
  }
  if (draft.expiry?.trim()) body.expiry = draft.expiry.trim()
  if (draft.strike != null && Number.isFinite(draft.strike)) body.strike = draft.strike
  if (draft.optionRight?.trim()) body.option_right = draft.optionRight.trim()
  // Instance and opportunity travel together. The rows already in the ledger
  // carry both; one without the other files under "No opportunity" and splits
  // the instance across two places in the Strategy view.
  if (draft.instanceId != null && draft.opportunityId != null) {
    body.strategy_instance_id = draft.instanceId
    body.strategy_opportunity_id = draft.opportunityId
  }
  return { ok: true, body }
}

function opportunityForInstance(fills: Execution[], instanceId: number): number | undefined {
  const found = new Set<number>()
  for (const f of fills) {
    if (f.strategy_instance_id === instanceId && f.strategy_opportunity_id != null) {
      found.add(f.strategy_opportunity_id)
    }
    for (const a of f.instance_allocations ?? []) {
      if (a.strategy_instance_id === instanceId && a.strategy_opportunity_id != null) {
        found.add(a.strategy_opportunity_id)
      }
    }
  }
  return found.size === 1 ? [...found][0] : undefined
}

/** A seed for one account's fills of one contract: the contract's key, and its instance only if unambiguous. */
export function journalSeedFromContract(
  group: OptExecutionGroup,
  accountFills: Execution[],
  accountId: string,
  mode: LedgerJournalMode,
  netQty: number,
): LedgerJournalSeed {
  const instanceIds = new Set(accountFills.flatMap(executionStrategyInstanceIds))
  const instanceId = instanceIds.size === 1 ? [...instanceIds][0] : undefined
  const opportunityId = instanceId != null ? opportunityForInstance(accountFills, instanceId) : undefined
  const strike = Number(group.strike)
  return {
    mode,
    accountId,
    symbol: accountFills[0]?.symbol ?? group.symbol,
    contractKey: group.contract_key,
    expiry: group.expiry || undefined,
    strike: Number.isFinite(strike) ? strike : undefined,
    optionRight: group.option_right || undefined,
    netQty,
    instanceId: opportunityId != null ? instanceId : undefined,
    opportunityId,
  }
}

export type ExpiredCloseTarget = { ok: true; seed: LedgerJournalSeed } | { ok: false; reason: string }

/**
 * What an expiry close for this group would write, or why it would write nothing.
 *
 * A group is one contract across accounts, so its `net_qty` can add a short in
 * one account to a long in another. The close is written per account, from that
 * account's own net, and only when exactly one account still holds the contract.
 */
export function expiredCloseTarget(group: OptExecutionGroup): ExpiredCloseTarget {
  const netByAccount = new Map<string, number>()
  for (const fill of group.trades ?? []) {
    const account = (fill.account_id ?? '').trim()
    netByAccount.set(account, (netByAccount.get(account) ?? 0) + signedFillQty(fill))
  }
  const open = [...netByAccount].filter(([account, net]) => account && Math.abs(net) > 1e-9)
  if (open.length === 0) return { ok: false, reason: 'Flat in every account — there is nothing to close.' }
  if (open.length > 1) {
    return { ok: false, reason: `Still open in ${open.length} accounts. Filter to one account to write its close.` }
  }
  const [accountId, netQty] = open[0]
  const accountFills = (group.trades ?? []).filter(f => (f.account_id ?? '').trim() === accountId)
  return { ok: true, seed: journalSeedFromContract(group, accountFills, accountId, 'expired', netQty) }
}
