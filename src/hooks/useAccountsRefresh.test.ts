/**
 * A refused accounts refresh says why (PROD 2026-10-15: the line read "Refresh accounts: 500"
 * while TWS was logged out). Payloads here are invented.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { postRefreshAccounts } from '@/api/monitor'
import { refreshFailureText } from '@/hooks/useAccountsRefresh'
import { closeTradeOperatorDialog, tradeOperatorStore } from '@/lib/auth/tradeOperator'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

async function failureOf(res: Response): Promise<string> {
  fetchMock.mockResolvedValue(res)
  try {
    await postRefreshAccounts()
  } catch (e) {
    return refreshFailureText(e)
  }
  throw new Error('expected the refresh to be refused')
}

const fetchMock = vi.fn()

describe('postRefreshAccounts / refreshFailureText', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    tradeOperatorStore.clear()
    closeTradeOperatorDialog()
  })

  it('reads the reason api 0.12.2 gives when IB is not connected', async () => {
    const detail =
      'IB is not connected on the host slot: TWS is not accepting API connections. ' +
      'Check that TWS is running and logged in, then refresh again. (slot_not_connected)'
    await expect(failureOf(json({ detail }, 503))).resolves.toBe(`Refresh accounts: ${detail}`)
  })

  it('reads the gateway code an older api sent beside a 500', async () => {
    await expect(failureOf(json({ ok: false, error: 'slot_not_connected' }, 500))).resolves.toBe(
      'Refresh accounts: slot_not_connected',
    )
  })

  it('falls back to the status line when the server gave no reason', async () => {
    await expect(failureOf(new Response('', { status: 502 }))).resolves.toBe('Refresh accounts: HTTP 502')
  })

  it('says what a network failure says', () => {
    expect(refreshFailureText(new TypeError('Failed to fetch'))).toBe('Failed to fetch')
    expect(refreshFailureText('nope')).toBe('Refresh accounts: network or API error')
  })

  it('resolves with the body of an accepted refresh', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, message: 'Accounts/positions fetched' }))
    await expect(postRefreshAccounts()).resolves.toEqual({ ok: true, message: 'Accounts/positions fetched' })
    expect(((fetchMock.mock.calls[0][1] ?? {}) as RequestInit).method).toBe('POST')
  })
})
