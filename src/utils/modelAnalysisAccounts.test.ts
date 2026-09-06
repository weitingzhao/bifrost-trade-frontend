import { describe, it, expect } from 'vitest'
import { resolveModelAnalysisAccounts, resolveModelBandAccount } from './modelAnalysisAccounts'
import type { StatusResponse } from '@/types/monitor'

const status = (accountIds: string[], host = 'U111', secondary = 'U222'): StatusResponse =>
  ({
    portfolio: { accounts: accountIds.map((account_id) => ({ account_id })) },
    config: { ib_client: { account: { event_host: host, event_secondary: secondary } } },
  }) as unknown as StatusResponse

const both = { host: true, secondary: true }
const hostOnly = { host: true, secondary: false }
const secondaryOnly = { host: false, secondary: true }
const neither = { host: false, secondary: false }

describe('resolveModelBandAccount', () => {
  const choice = resolveModelAnalysisAccounts(status(['U111', 'U222']))

  it('a single-account scope locks the band to that account and follows it', () => {
    expect(resolveModelBandAccount(choice, hostOnly, null)).toEqual({
      accountId: 'U111',
      side: 'host',
      locked: true,
      scopeHasBoth: false,
    })
    expect(resolveModelBandAccount(choice, secondaryOnly, null)).toEqual({
      accountId: 'U222',
      side: 'secondary',
      locked: true,
      scopeHasBoth: false,
    })
  })
  it('a locked scope ignores the override, and keeps it for when the scope widens again', () => {
    expect(resolveModelBandAccount(choice, hostOnly, 'secondary').accountId).toBe('U111')
    expect(resolveModelBandAccount(choice, both, 'secondary').accountId).toBe('U222')
  })
  it('both in scope defaults to Host, honours the override, and says it is reading one of two', () => {
    expect(resolveModelBandAccount(choice, both, null)).toEqual({
      accountId: 'U111',
      side: 'host',
      locked: false,
      scopeHasBoth: true,
    })
    expect(resolveModelBandAccount(choice, both, 'secondary')).toMatchObject({ accountId: 'U222', side: 'secondary' })
  })
  it('a host missing from the snapshot falls back to secondary when both are in scope, never when locked', () => {
    const noHost = resolveModelAnalysisAccounts(status(['U222']))
    expect(resolveModelBandAccount(noHost, both, null)).toMatchObject({ accountId: 'U222', side: 'secondary' })
    expect(resolveModelBandAccount(noHost, hostOnly, null)).toEqual({
      accountId: '',
      side: 'host',
      locked: true,
      scopeHasBoth: false,
    })
  })
  it('neither selectable, or neither in scope, yields an empty id so no request fires', () => {
    const none = resolveModelAnalysisAccounts(status(['U999']))
    expect(resolveModelBandAccount(none, both, null)).toMatchObject({ accountId: '', side: null })
    expect(resolveModelBandAccount(choice, neither, 'host')).toEqual({
      accountId: '',
      side: null,
      locked: true,
      scopeHasBoth: false,
    })
  })
})
