/**
 * TD-150: the retired data-gap sentences stay gone. The needles are built
 * from pieces so this file does not itself contain them.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { expect, it } from 'vitest'

const SRC = resolve(__dirname, '..')
const NOTES = join('layout', 'designNotes')

const RETIRED = [
  ['earnings date', 'reaches this side'].join(' '),
  ['No earnings date', 'on this side'].join(' '),
  ['carry nothing', 'at all'].join(' '),
  ['cannot say whether', 'they pay'].join(' '),
]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (relative(SRC, p) === NOTES) return []
      return files(p)
    }
    return /\.(ts|tsx)$/.test(name) ? [p] : []
  })
}

const sources = files(SRC).map((p) => ({ path: relative(SRC, p), text: readFileSync(p, 'utf8') }))

it('does not bring the retired data-gap phrases back', () => {
  const hits = sources.flatMap(({ path, text }) => {
    const lower = text.toLowerCase()
    return RETIRED.filter((phrase) => lower.includes(phrase.toLowerCase())).map(
      (phrase) => `${path}: ${phrase}`,
    )
  })
  expect(hits).toEqual([])
})

it('still says when a name lists only adjusted contracts', () => {
  const phrase = ['only adjusted', 'contracts'].join(' ')
  const hits = sources.filter(
    ({ path, text }) => path !== join('lib', 'dataGapWording.test.ts') && text.toLowerCase().includes(phrase),
  )
  expect(hits.map(({ path }) => path).length).toBeGreaterThan(0)
})
