/**
 * TD-19: 'trade' is the entity (one position opened under the rules, `Trade #NNN`). A fill count is
 * Fills, and one option contract taken flat is a contract (`ReviewContract`).
 *
 * Two ways the word drifts back, both caught here: a metric labelled 'Trades' whose
 * value is a fill count (the API's old `trade_count`, gone in core 0.42.0, counted every
 * fill, opening ones included), and the contract-level review names coming back under the old ones.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'

const SRC = resolve(__dirname, '..')
const THIS = join('lib', 'tradeWordForFills.test.ts')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return files(p)
    return /\.(ts|tsx)$/.test(name) && !p.endsWith(THIS) ? [p] : []
  })
}

const sources = files(SRC).map((p) => ({ p: p.slice(SRC.length + 1), text: readFileSync(p, 'utf8') }))

it("labels no fill count 'Trades'", () => {
  const FILL_COUNT = /trade_count|fills\.length|fillCount|fallbackFills/
  const hits = sources.flatMap(({ p, text }) =>
    text
      .split('\n')
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => /label:\s*['"`]Trades['"`]/.test(line) && FILL_COUNT.test(line))
      .map(({ i }) => `${p}:${i + 1}`),
  )
  expect(hits).toEqual([])
})

it('keeps the contract-level review names', () => {
  const OLD = /\b(ReviewTrade|buildReviewTrades|useReviewTrades|useTradeMarkPath)\b|utils\/reviewTrades'/
  expect(sources.filter(({ text }) => OLD.test(text)).map(({ p }) => p)).toEqual([])
})
