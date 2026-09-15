import { describe, expect, it } from 'vitest'
import { AGENT_MCP_SCOPES, PERSONA_CANNOT_LINES } from './agentPersonaCatalog'

describe('persona editor Tools / Cannot', () => {
  it('names D10 cannots without inventing extra powers', () => {
    expect([...PERSONA_CANNOT_LINES]).toEqual([
      'Place, modify, or cancel orders (D10)',
      'Write without a card you approve',
      "Read someone else's accounts",
    ])
  })

  it('keeps Tools it may call as the catalog scopes, empty meaning none', () => {
    expect(AGENT_MCP_SCOPES.explain).toEqual([])
    expect(AGENT_MCP_SCOPES.portfolio).toContain('trade.portfolio.snapshot')
  })
})
