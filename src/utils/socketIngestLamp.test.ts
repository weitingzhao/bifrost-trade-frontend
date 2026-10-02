import { describe, expect, it } from 'vitest'

import type { StatusResponse } from '@/types/monitor'

import {
  SOCKET_NAV_INGEST_IDS,
  categoryForServiceId,
  ingestRedisHealthLamp,
} from './socketIngestLamp'

describe('categoryForServiceId', () => {
  it('groups gateway ids under IB and daemons under Engine', () => {
    expect(categoryForServiceId('ib_ingestor')).toBe('IB')
    expect(categoryForServiceId('ib_market')).toBe('IB')
    expect(categoryForServiceId('ib_operator')).toBe('IB')
    expect(categoryForServiceId('ib_account_agent')).toBe('IB')
    expect(categoryForServiceId('trading_engine')).toBe('Engine')
    expect(categoryForServiceId('something_else')).toBe('Other')
  })
})

describe('SOCKET_NAV_INGEST_IDS', () => {
  it('is the Platform IB Gateway components only', () => {
    expect([...SOCKET_NAV_INGEST_IDS]).toEqual(['ib_ingestor', 'ib_operator', 'ib_account_agent'])
  })
})

describe('ingestRedisHealthLamp', () => {
  it('is gray for an id with no health source', () => {
    const { lamp } = ingestRedisHealthLamp('something_else', { socket: {} } as StatusResponse)
    expect(lamp).toBe('gray')
  })
})
