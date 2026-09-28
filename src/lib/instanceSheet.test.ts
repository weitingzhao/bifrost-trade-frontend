import { afterEach, describe, expect, it } from 'vitest'
import { closeInstanceSheet, instanceSheetStore, openInstanceCompare, openInstanceSheet, pruneInstanceSheet, showInstanceSheet, stepInstanceSheet } from './instanceSheet'

const sheet = () => instanceSheetStore.getState().sheet

describe('instance sheet', () => {
  afterEach(closeInstanceSheet)

  it('opens on the token with the rows it came from, and the same token closes it', () => {
    openInstanceSheet(12, [10, 12, 12, 14], 'Ledger · instances')
    expect(sheet()).toEqual({ id: 12, ids: [10, 12, 14], from: 'Ledger · instances', compareId: null })
    openInstanceSheet(12, [10, 12, 14])
    expect(sheet()).toBeNull()
  })

  it('a token outside its list opens alone', () => {
    openInstanceSheet(7, [1, 2])
    expect(sheet()?.ids).toEqual([7])
  })

  it('steps within the list and stops at its ends', () => {
    openInstanceSheet(10, [10, 12, 14])
    stepInstanceSheet(-1)
    expect(sheet()?.id).toBe(10)
    stepInstanceSheet(1)
    stepInstanceSheet(1)
    stepInstanceSheet(1)
    expect(sheet()?.id).toBe(14)
  })

  it('a compare does not step, and a token re-opens it as a single record', () => {
    openInstanceCompare(3, 4)
    stepInstanceSheet(1)
    expect(sheet()).toMatchObject({ id: 3, compareId: 4 })
    openInstanceSheet(3, [3])
    expect(sheet()).toMatchObject({ id: 3, compareId: null })
  })

  it('a deep link shows the record without toggling it shut', () => {
    openInstanceSheet(5, [5])
    showInstanceSheet(5)
    expect(sheet()?.id).toBe(5)
  })

  it('steps only the rows the book holds', () => {
    openInstanceSheet(12, [10, 11, 12, 13])
    pruneInstanceSheet(new Set([10, 13]))
    expect(sheet()?.ids).toEqual([10, 12, 13])
    stepInstanceSheet(1)
    expect(sheet()?.id).toBe(13)
  })
})
