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
    // Not a seat since 2026-09-14 (§11.0) — conversation is an action, not a place.
    expect(seat.isResearchSeat('copilot')).toBe(false)
    expect(seat.isResearchSeat('x')).toBe(false)
  })

  it('falls back to autopilot on a stored copilot residue', async () => {
    // A browser that sat in the Copilot seat before 2026-09-14 still carries
    // `{"seat":"copilot"}`. The store reads storage at import, so a fresh
    // import is the residue's arrival.
    localStorage.setItem('bifrost-research-seat', JSON.stringify({ seat: 'copilot' }))
    vi.resetModules()
    const fresh = await import('./seat')
    expect(fresh.getResearchSeat()).toBe('autopilot')
  })

  it('keeps the rail order manual-to-automatic, apart from the default', () => {
    // Rail order and default landing are two different decisions (Design (5)):
    // the rail reads Workbench · Autopilot; a first-time reader lands in
    // Autopilot, because the day's first question is what ran overnight.
    expect(seat.RESEARCH_SEATS).toEqual(['workbench', 'autopilot'])
  })
})
