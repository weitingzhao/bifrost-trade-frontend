/**
 * TD-24: the request body types in `requestBodies.ts` are written by hand from the
 * api's request models. `requestBodies.fields.json` is a copy of the api's
 * `contracts/request_bodies.json` (generated from those models and pinned by the
 * api's own test). This test holds the TS types to the copy, field for field, so an
 * undeclared field cannot reach a body the api will refuse once unknown fields are a 422.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import apiFields from './requestBodies.fields.json'

/** The api's model name → the TS interface that mirrors it. */
const TS_NAME: Record<string, string> = { OptionStockLinkBatch: 'OptionStockLinkBatchItem' }
/** Api models with no frontend caller. Empty since api 0.7.6: StrategyAttributionBatchBody went with
 * PATCH /executions/strategy-attribution (TD-40). */
const API_ONLY = new Set<string>()

function interfaceFields(source: string): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const parents: Record<string, string> = {}
  const re = /^(?:export )?interface (\w+)(?: extends (\w+))? \{\n([\s\S]*?)^\}/gm
  for (const m of source.matchAll(re)) {
    const [, name, parent, body] = m
    out[name] = [...body.matchAll(/^ {2}(\w+)\??:/gm)].map((f) => f[1])
    if (parent) parents[name] = parent
  }
  for (const [name, parent] of Object.entries(parents)) {
    out[name] = [...new Set([...(out[parent] ?? []), ...out[name]])]
  }
  return out
}

const ts = interfaceFields(readFileSync(resolve(__dirname, 'requestBodies.ts'), 'utf8'))
const api = apiFields as Record<string, string[]>

describe('requestBodies.ts mirrors the api request models', () => {
  for (const [model, fields] of Object.entries(api)) {
    if (API_ONLY.has(model)) continue
    const name = TS_NAME[model] ?? model
    it(`${name} has exactly the fields of ${model}`, () => {
      expect(ts[name], `no interface ${name} in requestBodies.ts`).toBeDefined()
      expect([...ts[name]].sort()).toEqual([...fields].sort())
    })
  }

  it('declares no body the api does not have', () => {
    const mirrored = new Set(Object.keys(api).map((m) => TS_NAME[m] ?? m))
    const local = Object.keys(ts).filter((n) => n !== 'ExecutionFields')
    expect(local.filter((n) => !mirrored.has(n))).toEqual([])
  })

  // Locally (and in the release worktrees) the api checkout sits beside this one:
  // the copy must still equal the api's snapshot. CI clones the frontend alone.
  const sibling = resolve(__dirname, '../../../bifrost-trade-api/contracts/request_bodies.json')
  it.skipIf(!existsSync(sibling))('the copy equals the api snapshot beside this checkout', () => {
    expect(api).toEqual(JSON.parse(readFileSync(sibling, 'utf8')))
  })
})
