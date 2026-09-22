import { describe, expect, it } from 'vitest'
import { edgeCount, filterByPath, wiringRows } from './wiringRows'

const AGENTS = ['discovery', 'analyze', 'verdict', 'loop_curator', 'explain']

describe('wiringRows', () => {
  it('reads each agent’s edges off the catalog, not a second list', () => {
    const rows = wiringRows(AGENTS)
    const verdict = rows.find((r) => r.agent === 'verdict')
    expect(verdict?.calls).toEqual(['discovery', 'analyze', 'validate', 'portfolio'])
    expect(rows.find((r) => r.agent === 'loop_curator')?.invokedBy).toEqual([
      { by: 'research-loop-batch', kind: 'chain' },
    ])
  })

  it('carries the one note worth printing on a row', () => {
    // Validate's neutral mandate is why it agrees least and weighs most.
    expect(wiringRows(['validate'])[0].note).toBe('neutral mandate')
    expect(wiringRows(['explain'])[0].note).toBeNull()
  })
})

describe('filterByPath', () => {
  it('narrows to the path and counts the edges that remain', () => {
    const rows = wiringRows(AGENTS)
    const batch = filterByPath(rows, 'batch').map((r) => r.agent)
    expect(batch).toEqual(['analyze', 'verdict', 'loop_curator'])
    // The loop's curator is off the chat path entirely since its edge became
    // `chain`, so a chat filter must not show it.
    expect(filterByPath(rows, 'chat').map((r) => r.agent)).not.toContain('loop_curator')
    expect(edgeCount(filterByPath(rows, 'all'))).toBeGreaterThan(edgeCount(filterByPath(rows, 'batch')))
  })
})
