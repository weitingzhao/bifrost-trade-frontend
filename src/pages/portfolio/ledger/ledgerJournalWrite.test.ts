import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { buildOptExecutionGroups } from '@/utils/ledger/optExecutionGroups'
import {
  expiredCloseTarget,
  journalCreateBody,
  journalDraftFromSeed,
  journalSeedFromContract,
  type LedgerJournalSeed,
} from './ledgerJournalWrite'

// Invented contract. The key is written the way stored rows carry it (strike with
// one decimal), which is not the way the API would build one if none were sent.
const KEY = 'ZZZ   240119C00050000|OPT|20240119|50.0|C'

// DEV rows say BUY / SELL; the Execution type still spells them Buy / Sell.
function fill(partial: Omit<Partial<Execution>, 'side'> & { side?: string }): Execution {
  return {
    account_executions_id: 1,
    account_id: 'A1',
    contract_key: KEY,
    symbol: 'ZZZ   240119C00050000',
    sec_type: 'OPT',
    side: 'BUY',
    qty: 1,
    quantity: 1,
    price: 1,
    time: 1_700_000_000,
    trade_date: '2024-01-10',
    expiry: '20240119',
    strike: 50,
    option_right: 'C',
    ...partial,
  } as Execution
}

const SEED: LedgerJournalSeed = {
  mode: 'expired',
  accountId: 'A1',
  symbol: 'ZZZ   240119C00050000',
  contractKey: KEY,
  expiry: '20240119',
  strike: 50,
  optionRight: 'C',
  netQty: 3,
  instanceId: 11,
  opportunityId: 7,
}

describe('journalDraftFromSeed', () => {
  it('Expired worthless flattens the net at a zero price', () => {
    const d = journalDraftFromSeed(SEED)
    expect(d).toMatchObject({ side: 'SELL', quantity: 3, price: 0, contractKey: KEY })
  })
})

describe('journalCreateBody', () => {
  it("writes the contract's own key, so the close joins the position it closes", () => {
    const res = journalCreateBody(journalDraftFromSeed(SEED), 1_700_000_000)
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.body.contract_key).toBe(KEY)
    expect(res.body).toMatchObject({ source: 'journal_closed', sec_type: 'OPT', quantity: -3, price: 0 })
    expect(res.body).not.toHaveProperty('trade_date')
    expect(res.body).not.toHaveProperty('transaction_type')
  })

  it('refuses to write without a contract key rather than letting the API invent one', () => {
    const res = journalCreateBody({ ...journalDraftFromSeed(SEED), contractKey: '' }, 1_700_000_000)
    expect(res.ok).toBe(false)
  })

  it('carries the opportunity with the instance, as the rows already in the ledger do', () => {
    const res = journalCreateBody(journalDraftFromSeed(SEED), 1_700_000_000)
    if (!res.ok) throw new Error(res.error)
    expect(res.body.strategy_instance_id).toBe(11)
    expect(res.body.strategy_opportunity_id).toBe(7)
  })

  it('writes neither when the opportunity is unknown, instead of an instance under No opportunity', () => {
    const res = journalCreateBody(
      journalDraftFromSeed({ ...SEED, opportunityId: undefined }),
      1_700_000_000,
    )
    if (!res.ok) throw new Error(res.error)
    expect(res.body).not.toHaveProperty('strategy_instance_id')
    expect(res.body).not.toHaveProperty('strategy_opportunity_id')
  })

  it('refuses Assignment until the API can store BookTrade', () => {
    expect(journalCreateBody(journalDraftFromSeed({ ...SEED, mode: 'assigned' }), 1).ok).toBe(false)
  })
})

describe('journalSeedFromContract', () => {
  it('takes the opportunity from an allocation when the fill carries only allocations', () => {
    const f = fill({
      strategy_instance_id: null,
      strategy_opportunity_id: null,
      instance_allocations: [{ strategy_instance_id: 12, allocated_quantity: 1, strategy_opportunity_id: 8 }],
    } as Omit<Partial<Execution>, 'side'>)
    const [group] = buildOptExecutionGroups([f])
    const seed = journalSeedFromContract(group, [f], 'A1', 'expired', 1)
    expect(seed).toMatchObject({ instanceId: 12, opportunityId: 8, contractKey: KEY })
  })

  it('names no instance when the fills disagree on one', () => {
    const a = fill({ account_executions_id: 1, strategy_instance_id: 11, strategy_opportunity_id: 7 })
    const b = fill({ account_executions_id: 2, strategy_instance_id: 12, strategy_opportunity_id: 7 })
    const [group] = buildOptExecutionGroups([a, b])
    const seed = journalSeedFromContract(group, [a, b], 'A1', 'expired', 2)
    expect(seed.instanceId).toBeUndefined()
    expect(seed.opportunityId).toBeUndefined()
  })
})

describe('expiredCloseTarget', () => {
  it("closes one account's own net", () => {
    const fills = [
      fill({ account_executions_id: 1, side: 'SELL', quantity: -2, qty: 2 }),
      fill({ account_executions_id: 2, side: 'SELL', quantity: -1, qty: 1 }),
    ]
    const [group] = buildOptExecutionGroups(fills)
    const target = expiredCloseTarget(group)
    expect(target.ok).toBe(true)
    if (!target.ok) return
    expect(target.seed).toMatchObject({ accountId: 'A1', netQty: -3 })
    expect(journalDraftFromSeed(target.seed)).toMatchObject({ side: 'BUY', quantity: 3 })
  })

  it('writes nothing when two accounts still hold it, even if the group nets to zero', () => {
    const fills = [
      fill({ account_executions_id: 1, account_id: 'A1', side: 'BUY', quantity: 1, qty: 1 }),
      fill({ account_executions_id: 2, account_id: 'A2', side: 'SELL', quantity: -1, qty: 1 }),
    ]
    const [group] = buildOptExecutionGroups(fills)
    const target = expiredCloseTarget(group)
    expect(target.ok).toBe(false)
  })

  it('writes nothing for a flat position', () => {
    const fills = [
      fill({ account_executions_id: 1, side: 'BUY', quantity: 1, qty: 1 }),
      fill({ account_executions_id: 2, side: 'SELL', quantity: -1, qty: 1 }),
    ]
    const [group] = buildOptExecutionGroups(fills)
    expect(expiredCloseTarget(group).ok).toBe(false)
  })
})
