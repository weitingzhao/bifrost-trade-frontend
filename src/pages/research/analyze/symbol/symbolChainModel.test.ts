import { describe, expect, it } from 'vitest'
import { cardExpiries } from './symbolChainModel'

// Made-up expiries.
const LISTED = ['2027-01-04', '2027-01-06', '2027-01-08', '2027-01-11', '2027-01-15', '2027-02-19', '2027-03-19']

describe('the expiry cards', () => {
  it('shows the five nearest', () => {
    expect(cardExpiries(LISTED, null)).toEqual({ expiries: LISTED.slice(0, 5), handedMissing: false })
  })

  it('adds a handed-over expiry listed further out, rather than lighting the strike on the nearest', () => {
    expect(cardExpiries(LISTED, '2027-03-19').expiries).toEqual([...LISTED.slice(0, 5), '2027-03-19'])
    expect(cardExpiries(LISTED, '2027-01-08').expiries).toEqual(LISTED.slice(0, 5))
  })

  it('adds the first expiry after the next earnings print, so its E has a card', () => {
    expect(cardExpiries(LISTED, null, '2027-02-10').expiries).toEqual([...LISTED.slice(0, 5), '2027-02-19'])
    // Already among the five: nothing added.
    expect(cardExpiries(LISTED, null, '2027-01-05').expiries).toEqual(LISTED.slice(0, 5))
    // An expiry on the print's own day may expire before it; the next one carries it.
    expect(cardExpiries(LISTED, null, '2027-02-19').expiries).toEqual([...LISTED.slice(0, 5), '2027-03-19'])
    expect(cardExpiries(LISTED, '2027-03-19', '2027-02-10').expiries).toEqual([...LISTED.slice(0, 5), '2027-02-19', '2027-03-19'])
  })

  it('says so when the store does not list it — and not before the list has answered', () => {
    expect(cardExpiries(LISTED, '2027-06-18').handedMissing).toBe(true)
    expect(cardExpiries(undefined, '2027-06-18').handedMissing).toBe(false)
  })
})
