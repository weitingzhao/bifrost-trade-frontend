import { describe, expect, it } from 'vitest'
import { EQUIP_GROUPS } from './equip'
import { parkGate } from './parkGate'

describe('the park gate (design 2026-09-27)', () => {
  const book = EQUIP_GROUPS.find((g) => g.id === 'book')!
  const member = book.pages[0].to

  it('a member page gets a chip back to its module home', () => {
    expect(parkGate(member, [])).toMatchObject({ to: book.hub.to })
  })

  it('at the gate there is nothing to go back to', () => {
    expect(parkGate(book.hub.to, [])).toBeNull()
  })

  it('yields where the trail already links the home (r4)', () => {
    expect(parkGate(member, [{ to: book.hub.to }])).toBeNull()
  })

  it('a page in no module has no gate', () => {
    expect(parkGate('/portfolio/positions', [])).toBeNull()
  })
})
