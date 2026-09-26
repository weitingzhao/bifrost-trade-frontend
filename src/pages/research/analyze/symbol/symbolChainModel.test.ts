import { describe, expect, it } from 'vitest'
import { cardExpiries, isMonthlyExpiry } from './symbolChainModel'

// Made-up expiries.
const LISTED = ['2027-01-04', '2027-01-06', '2027-01-08', '2027-01-11', '2027-01-15', '2027-02-19', '2027-03-19']

describe('the expiry cards', () => {
  it('draws the design’s set: the two nearest, then three monthlies', () => {
    expect(cardExpiries(LISTED, null)).toEqual({
      expiries: ['2027-01-04', '2027-01-06', '2027-01-15', '2027-02-19', '2027-03-19'],
      handedMissing: false,
    })
  })

  it('knows a monthly by its third Friday, or the Thursday a holiday moves it to', () => {
    const listed = new Set(['2027-06-11', '2027-06-17', '2027-07-16'])
    expect(isMonthlyExpiry('2027-07-16', listed)).toBe(true)
    expect(isMonthlyExpiry('2027-06-17', listed)).toBe(true)
    expect(isMonthlyExpiry('2027-06-11', listed)).toBe(false)
    // A Thursday with its Friday listed is a weekly, not the month's.
    expect(isMonthlyExpiry('2027-06-17', new Set(['2027-06-17', '2027-06-18']))).toBe(false)
  })

  it('fills with the nearest others when the store lists too few monthlies', () => {
    const weeklies = ['2027-01-04', '2027-01-06', '2027-01-08', '2027-01-11', '2027-01-13', '2027-01-15']
    expect(cardExpiries(weeklies, null).expiries).toEqual(['2027-01-04', '2027-01-06', '2027-01-08', '2027-01-11', '2027-01-15'])
  })

  it('adds a handed-over expiry that is not among the cards, rather than lighting the strike elsewhere', () => {
    expect(cardExpiries(LISTED, '2027-01-11').expiries).toEqual(['2027-01-04', '2027-01-06', '2027-01-11', '2027-01-15', '2027-02-19', '2027-03-19'])
    expect(cardExpiries(LISTED, '2027-02-19').expiries).toHaveLength(5)
  })

  it('says so when the store does not list it — and not before the list has answered', () => {
    expect(cardExpiries(LISTED, '2027-06-18').handedMissing).toBe(true)
    expect(cardExpiries(undefined, '2027-06-18').handedMissing).toBe(false)
  })
})

