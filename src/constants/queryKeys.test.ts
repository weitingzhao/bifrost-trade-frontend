import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { QUERY_KEYS } from './queryKeys'

/**
 * TD-39: "research" named two backends — the Trade API's research app (`/api/research`)
 * and the Research service (`/api/plugin/research`) — and one key namespace covered
 * both. Each now has its own prefix, so a key says which backend answers it.
 */

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p))
    else if (/\.tsx?$/.test(name) && !name.includes('.test.')) out.push(p)
  }
  return out
}

/** Every key a factory can produce: arrays as they are, functions called with placeholder args. */
function keysOf(node: unknown): (readonly unknown[])[] {
  if (Array.isArray(node)) return [node]
  if (typeof node === 'function') {
    const args = Array.from({ length: node.length }, () => 'x')
    return keysOf((node as (...a: unknown[]) => unknown)(...args))
  }
  if (node && typeof node === 'object') return Object.values(node).flatMap(keysOf)
  return []
}

describe('research query keys are split by backend', () => {
  it('every tradeResearch key starts with trade-research', () => {
    const keys = keysOf(QUERY_KEYS.tradeResearch)
    expect(keys.length).toBeGreaterThan(10)
    expect(keys.filter((k) => k[0] !== 'trade-research')).toEqual([])
  })

  it('every researchEngine key starts with research-engine', () => {
    const keys = keysOf(QUERY_KEYS.researchEngine)
    expect(keys.length).toBeGreaterThan(30)
    expect(keys.filter((k) => k[0] !== 'research-engine')).toEqual([])
  })

  it('no key anywhere uses the old shared research prefix', () => {
    const all = keysOf(QUERY_KEYS)
    expect(all.filter((k) => k[0] === 'research')).toEqual([])
    const literal = /\[\s*['"]research['"]\s*[,\]]/
    const offenders = sourceFiles('src').filter((f) => literal.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('the scan still sees the literal keys (it has not gone quiet)', () => {
    const users = sourceFiles('src').filter((f) => /\[\s*'research-engine',/.test(readFileSync(f, 'utf8')))
    expect(users.length).toBeGreaterThanOrEqual(40)
  })
})
