/**
 * A settings page's one hard rule: read the value, never the secret.
 */
import { describe, expect, it } from 'vitest'
import type { StatusResponse } from '@/types/monitor'
import type { FlexConfigSummary } from '@/api/flexQueryPlugin'
import type { FlexCoverageFreshnessResponse } from '@/types/trading'
import {
  flexRows,
  flexStanding,
  ibClientIdLines,
  ibConnectionLines,
  ibRows,
  ibSlotStanding,
  initFlexRows,
} from './settingsModel'

const status = (over: Record<string, unknown> = {}): StatusResponse =>
  ({
    socket: {
      ib_ingestor: { connected: true },
      ib_account_agent: { connected: true },
      ib_operator: { connected: true },
    },
    config: {
      ib_client: {
        client: { host_ip: '192.168.10.20', host_port_type: 'tws_live', secondary_host_ip: '192.168.10.21', secondary_port_type: 'tws_paper' },
        account: { trading: 'U1234567', event_host: 'U1234567', event_secondary: 'U7654321' },
      },
    },
    ...over,
  }) as unknown as StatusResponse

describe('ibSlotStanding', () => {
  it('says how many of the three answered, not just that some did', () => {
    expect(ibSlotStanding(status())).toBe('3 agents connected')
    expect(
      ibSlotStanding(
        status({ socket: { ib_ingestor: { connected: true }, ib_account_agent: {}, ib_operator: {} } }),
      ),
    ).toBe('1 of 3 agents connected')
  })

  it('is "not probed" rather than zero when the monitor has not answered', () => {
    expect(ibSlotStanding(undefined)).toBe('not probed')
  })
})

describe('ibRows', () => {
  it('reads the three the design names, in its order', () => {
    const rows = ibRows(status())
    expect(rows.map((r) => r.label)).toEqual(['User (YAML)', 'Client ID (YAML)', 'Account'])
    expect(rows[0].reading).toBe('host 192.168.10.20 · secondary 192.168.10.21')
    expect(rows[2].reading).toContain('U1234567')
  })

  it('dashes a row the config does not carry, rather than inventing one', () => {
    const rows = ibRows({ config: {} } as unknown as StatusResponse)
    expect(rows.every((r) => r.reading === '—')).toBe(true)
  })
})

describe('flexRows', () => {
  it('reports that a token is set and its last four — never the token', () => {
    const summary = {
      tokens: { host_token_set: true, host_token_last4: '1441', secondary_token_set: true, secondary_token_last4: '6139' },
      range_days: { default: 30, init: 270 },
      query_rows: [
        { query_host_id: '123', purpose: 'trades' },
        { query_host_id: '', purpose: 'cash_transactions' },
      ],
    } as FlexConfigSummary
    const rows = flexRows(summary)
    expect(rows[0].reading).toBe('token set (…1441) · secondary …6139')
    expect(rows[1].reading).toBe('1 of 2 queries have an id')
    expect(rows[2].reading).toBe('30d · first run 270d')
  })

  it('says no token rather than leaving the row blank', () => {
    expect(flexRows(undefined)[0].reading).toBe('no token set')
  })
})

describe('flexStanding', () => {
  const NOW = Date.parse('2026-09-22T12:00:00Z')
  const fresh = (dims: { dimension: string; latest_ts: string }[]) =>
    ({ dimensions: dims }) as FlexCoverageFreshnessResponse

  it('says when each kind last landed, per kind', () => {
    const s = flexStanding(
      fresh([
        { dimension: 'flex-trades', latest_ts: '2026-09-22T10:30:23Z' },
        { dimension: 'flex-transactions', latest_ts: '2026-09-22T10:30:24Z' },
      ]),
      NOW,
    )
    expect(s).toEqual({ text: 'trades 1h ago · transactions 1h ago', tone: 'ok' })
  })

  it('turns amber once a daily pull has plainly missed one', () => {
    const s = flexStanding(fresh([{ dimension: 'flex-trades', latest_ts: '2026-09-20T10:00:00Z' }]), NOW)
    expect(s.tone).toBe('warn')
  })

  it('says no pull recorded rather than reading as fresh', () => {
    expect(flexStanding(undefined, NOW)).toEqual({ text: 'no pull recorded', tone: 'gray' })
    expect(flexStanding(fresh([]), NOW).tone).toBe('gray')
  })
})

describe('the YAML rows, opened', () => {
  it('reads each slot where it connects, and names the port by what it is', () => {
    const lines = ibConnectionLines(status())
    expect(lines.map((l) => [l.label, l.host, l.secondary])).toEqual([
      ['IP / host', '192.168.10.20', '192.168.10.21'],
      ['Port type', 'TWS Live (7496)', 'TWS Paper (7497)'],
    ])
  })

  it('says a secondary slot is off rather than printing its stale port', () => {
    const off = status({
      config: { ib_client: { client: { host_ip: '10.0.0.1', host_port_type: 'gateway', secondary_host_ip: '' } } },
    })
    expect(ibConnectionLines(off)[0].secondary).toBe('disabled')
    expect(ibConnectionLines(off)[1].secondary).toBe('—')
  })

  it('lists every client id the YAML assigns, grouped as the old page grouped them', () => {
    const withIds = status({
      config: {
        ib_client: {
          client: { host_ip: '10.0.0.1', secondary_host_ip: '10.0.0.2' },
          port: { trading: 10, listener_host: 1, listener_secondary: 1, operator_host: 20, operator_secondary: 21, ingestor: 50, account_agent: 60 },
        },
      },
    })
    const lines = ibClientIdLines(withIds)
    expect(lines.filter((l) => l.group).map((l) => l.group)).toEqual(['Daemon', 'Socket services'])
    expect(lines.map((l) => [l.label, l.host, l.secondary])).toEqual([
      ['Trading', '10', '—'],
      ['Listener', '1', '1'],
      ['Operator (cmd RPC)', '20', '21'],
      ['Ingestor', '50', '—'],
      ['Account agent', '60', '—'],
    ])
  })
})

describe('initFlexRows', () => {
  it('gives one editable row per query the plugin runs, whatever the store holds', () => {
    expect(initFlexRows(undefined).map((r) => [r.purpose, r.query_host_id])).toEqual([
      ['cash_transactions', ''],
      ['trades', ''],
    ])
    const rows = initFlexRows([{ purpose: 'trades', query_host_id: '42', query_secondary_id: '43' }])
    expect(rows[1]).toMatchObject({ purpose: 'trades', query_label: 'Trades', query_host_id: '42', query_secondary_id: '43' })
    expect(rows[0].query_host_id).toBe('')
  })
})
