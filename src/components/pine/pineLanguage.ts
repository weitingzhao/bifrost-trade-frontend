/**
 * Pine Script (v5/v6) highlighting for the Pine library editor (ledger S12,
 * Owner 2026-10-06). A stream tokenizer, not a parser: it names what a reader
 * scans for — keywords, the built-in namespaces (ta., math., request.…),
 * strings, numbers, comments, `//@version` — and the option context series
 * a script reads with request.security (IV_30, VRP_20, … are strings there,
 * so they read as strings). The checks that find mistakes are the runner's
 * (`/lint`); this only colours.
 */
import type { StreamParser, StringStream } from '@codemirror/language'

const KEYWORDS = new Set([
  'if', 'else', 'for', 'to', 'by', 'while', 'switch', 'var', 'varip', 'and', 'or', 'not', 'true', 'false',
  'import', 'export', 'method', 'type', 'continue', 'break', 'in', 'na',
])
const TYPES = new Set(['int', 'float', 'bool', 'string', 'color', 'line', 'label', 'box', 'table', 'array', 'matrix', 'map', 'series', 'simple', 'const'])
const NAMESPACES = new Set([
  'ta', 'math', 'request', 'strategy', 'input', 'array', 'matrix', 'map', 'str', 'color', 'timeframe', 'syminfo',
  'barstate', 'session', 'shape', 'location', 'plot', 'hline', 'line', 'label', 'box', 'table', 'barmerge', 'display', 'size', 'position', 'format', 'currency', 'dayofweek', 'chart',
])
const BUILTIN_VARS = new Set([
  'open', 'high', 'low', 'close', 'volume', 'hl2', 'hlc3', 'ohlc4', 'hlcc4', 'time', 'bar_index', 'last_bar_index',
  'dayofmonth', 'dayofweek', 'month', 'year', 'weekofyear', 'hour', 'minute',
])
const DECLARATIONS = new Set(['indicator', 'strategy', 'library'])
const OUTPUTS = new Set(['plot', 'plotshape', 'plotchar', 'plotarrow', 'plotcandle', 'plotbar', 'bgcolor', 'fill', 'hline', 'alertcondition', 'alert'])

export interface PineState {
  /** Inside a string that the line has not closed (Pine strings end on their line). */
  quote: string | null
}

function token(stream: StringStream, state: PineState): string | null {
  if (stream.sol()) state.quote = null
  if (state.quote) {
    let escaped = false
    let ch: string | void
    while ((ch = stream.next()) != null) {
      if (ch === state.quote && !escaped) {
        state.quote = null
        break
      }
      escaped = !escaped && ch === '\\'
    }
    return 'string'
  }
  if (stream.eatSpace()) return null
  if (stream.match('//@')) {
    stream.skipToEnd()
    return 'meta'
  }
  if (stream.match('//')) {
    stream.skipToEnd()
    return 'comment'
  }
  const ch = stream.peek()
  if (ch === '"' || ch === "'") {
    stream.next()
    state.quote = ch
    return token(stream, state)
  }
  if (stream.match(/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?/)) return 'atom'
  if (stream.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/)) return 'number'
  if (stream.match(/^(?::=|=>|==|!=|>=|<=|\+=|-=|\*=|\/=|[-+*/%<>=?:])/)) return 'operator'
  const word = stream.match(/^[A-Za-z_][\w]*/) as RegExpMatchArray | null
  if (word) {
    const w = word[0]
    if (stream.peek() === '.' && NAMESPACES.has(w)) return 'namespace'
    if (KEYWORDS.has(w)) return 'keyword'
    if (TYPES.has(w)) return 'typeName'
    if (DECLARATIONS.has(w) || OUTPUTS.has(w)) return 'definitionKeyword'
    if (BUILTIN_VARS.has(w)) return 'variableName.special'
    if (stream.peek() === '(') return 'variableName.function'
    return 'variableName'
  }
  if (stream.eat('.')) {
    // a member after a namespace: ta.sma, math.max, request.security
    if (stream.match(/^[A-Za-z_]\w*/)) return 'propertyName'
    return null
  }
  stream.next()
  return null
}

export const pineStreamParser: StreamParser<PineState> = {
  name: 'pine',
  startState: () => ({ quote: null }),
  token,
  languageData: { commentTokens: { line: '//' } },
}
