import { StringStream } from '@codemirror/language'
import { describe, expect, it } from 'vitest'
import { pineStreamParser, type PineState } from './pineLanguage'

function tokens(line: string): [string, string | null][] {
  const state: PineState = pineStreamParser.startState!(4)
  const s = new StringStream(line, 4, 4)
  const out: [string, string | null][] = []
  while (!s.eol()) {
    const style = pineStreamParser.token(s, state)
    const text = s.current()
    if (text.trim()) out.push([text, style])
    s.start = s.pos
  }
  return out
}

describe('Pine highlighting', () => {
  it('names what a reader scans for', () => {
    expect(tokens('vrp = request.security("VRP_20", timeframe.period, close)')).toEqual([
      ['vrp', 'variableName'],
      ['=', 'operator'],
      ['request', 'namespace'],
      ['.security', 'propertyName'],
      ['(', null],
      ['"VRP_20"', 'string'],
      [',', null],
      ['timeframe', 'namespace'],
      ['.period', 'propertyName'],
      [',', null],
      ['close', 'variableName.special'],
      [')', null],
    ])
    expect(tokens('if close > 1.5 and not na(x) // why')).toEqual([
      ['if', 'keyword'],
      ['close', 'variableName.special'],
      ['>', 'operator'],
      ['1.5', 'number'],
      ['and', 'keyword'],
      ['not', 'keyword'],
      ['na', 'keyword'],
      ['(', null],
      ['x', 'variableName'],
      [')', null],
      ['// why', 'comment'],
    ])
    expect(tokens('//@version=5')).toEqual([['//@version=5', 'meta']])
    expect(tokens('plotshape(f(close), "buy")').slice(0, 3)).toEqual([
      ['plotshape', 'definitionKeyword'],
      ['(', null],
      ['f', 'variableName.function'],
    ])
  })

  it('ends an unclosed string at the end of its line', () => {
    expect(tokens('a = "open')).toEqual([
      ['a', 'variableName'],
      ['=', 'operator'],
      ['"open', 'string'],
    ])
  })
})
