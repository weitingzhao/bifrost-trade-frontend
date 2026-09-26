import { describe, expect, it } from 'vitest'
import { stepValue } from '@bifrost/ui'

describe('numeric step (design Rev .72 §7)', () => {
  it('steps by the last decimal place and keeps the writing', () => {
    expect(stepValue('12', 1)).toBe('13')
    expect(stepValue('1.25', 1)).toBe('1.26')
    expect(stepValue('$84,000', 1)).toBe('$84,001')
    expect(stepValue('1,000', 10)).toBe('1,010')
    expect(stepValue('33%', -1)).toBe('32%')
    expect(stepValue('0.5', -10)).toBe('-0.5')
    expect(stepValue('$1', -2)).toBe('-$1')
  })

  it('uses the field’s own step when it has one', () => {
    expect(stepValue('10', 1, '5')).toBe('15')
    expect(stepValue('2.5', -1, '0.5')).toBe('2.0')
    expect(stepValue('3', 1, '0.5')).toBe('3.5')
    expect(stepValue('3.5', -1, '0.5')).toBe('3.0')
  })

  it('leaves what is not a number alone', () => {
    expect(stepValue('AAPL', 1)).toBeNull()
    expect(stepValue('', 1)).toBeNull()
    expect(stepValue('12 shares', 1)).toBeNull()
  })
})
