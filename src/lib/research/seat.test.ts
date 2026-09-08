import { beforeAll, describe, expect, it, vi } from 'vitest'

// The suite's localStorage is a partial mock; the store reads it at import.
function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  }
}

let seat: typeof import('./seat')

beforeAll(async () => {
  vi.stubGlobal('localStorage', memoryStorage())
  seat = await import('./seat')
})

describe('research seat', () => {
  it('defaults to autopilot and persists a valid choice', () => {
    expect(seat.getResearchSeat()).toBe('autopilot')
    seat.setResearchSeat('workbench')
    expect(seat.getResearchSeat()).toBe('workbench')
    expect(JSON.parse(localStorage.getItem('bifrost-research-seat') ?? '{}')).toEqual({ seat: 'workbench' })
  })

  it('ignores a value that is not a seat', () => {
    seat.setResearchSeat('autopilot')
    seat.setResearchSeat('pilot' as never)
    expect(seat.getResearchSeat()).toBe('autopilot')
    expect(seat.isResearchSeat('copilot')).toBe(true)
    expect(seat.isResearchSeat('x')).toBe(false)
  })
})
