import { describe, expect, it } from 'vitest'
import { appendSymbols } from './symbolList'

describe('appendSymbols', () => {
  it('keeps originals when adding a source with overlapping names', () => {
    expect(appendSymbols(['AAA', 'BBB'], ['bbb', ' qqq ', ''])).toEqual(['AAA', 'BBB', 'QQQ'])
  })
  it('does not clear the list when a source is empty', () => {
    expect(appendSymbols(['AAA'], [])).toEqual(['AAA'])
  })
})
