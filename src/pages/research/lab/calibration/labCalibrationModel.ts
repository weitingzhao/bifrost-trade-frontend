/**
 * The Calibration page's data (design `System Data Calibration.dc.html`,
 * route rev 2026-09-20.4), read from the live documents.
 *
 * Until 2026-09-25 this file held the rows transcribed from
 * RESEARCH_CALIBRATION.md round 2026-09-08.9, and the page probed the live
 * version to say when the transcription fell behind. A transcription is a copy
 * that has to be redone every round, and it had already drifted from its
 * source — condensed evidence, and two "smallest change" lines reworded. So
 * the page reads the two documents the research API serves and parses them
 * (Owner 2026-09-25, when Calibration moved to System › Alignment):
 *
 *   - RESEARCH_BLUEPRINT.md: `| C-F1 | contract |` — the contract's wording
 *   - RESEARCH_CALIBRATION.md §2: `| C-F1 | ⚠️ | evidence |`, one table per
 *     layer — the state and its evidence
 *   - §3: `| ids | gap | smallest change |` — the document's own fix list
 *   - §2's `**计数**：✅ n ⚠️ n ❌ n ⏳ n` — the roll-up it states
 *
 * This page renders the documents; it does not judge. A row the parser cannot
 * read is left out and counted, never guessed.
 */

export type ContractState = 'ok' | 'warn' | 'fail' | 'ramp'

/**
 * Four contract states on the four-lamp vocabulary (§11.3.1): a broken
 * contract is a real fault, so it is red; a ramping one has a reading but no
 * verdict, so it is grey.
 */
export const STATE: Record<
  ContractState,
  {
    label: string
    lamp: string
    variant: 'success' | 'warning' | 'danger' | 'neutral'
    sym: string
    note: string
  }
> = {
  ok: { label: 'met', lamp: 'green', variant: 'success', sym: '✅', note: 'evidence on file' },
  warn: { label: 'partly met', lamp: 'yellow', variant: 'warning', sym: '⚠️', note: 'named gap remains' },
  fail: { label: 'not met', lamp: 'red', variant: 'danger', sym: '❌', note: 'real fault' },
  ramp: { label: 'ramping', lamp: 'gray', variant: 'neutral', sym: '⏳', note: 'rule landed, supply climbing' },
}

export const STATE_ORDER: readonly ContractState[] = ['ok', 'warn', 'fail', 'ramp']

export const LAYERS: readonly [string, string, string][] = [
  ['F', '基础层 · Foundation', 'lenses, registry, universe'],
  ['R', '实绩层 · Record', 'what happened next'],
  ['A', '智囊 · Autopilot', 'judgement layer'],
  ['C', '操作面 · Copilot', 'the desk'],
  ['U', 'UI', 'seat and navigation'],
]

export interface ContractRow {
  id: string
  state: ContractState
  contract: string
  evidence: string
  layer: string
}

export interface FixRow {
  ids: string
  gap: string
  fix: string
}

export function rowTally(rows_: readonly ContractRow[]): Record<ContractState, number> {
  const t: Record<ContractState, number> = { ok: 0, warn: 0, fail: 0, ramp: 0 }
  for (const r of rows_) t[r.state] += 1
  return t
}

export function talliesDisagree(
  doc: Record<ContractState, number>,
  row: Record<ContractState, number>,
): boolean {
  return STATE_ORDER.some((k) => doc[k] !== row[k])
}


const SYMBOL: Record<string, ContractState> = { '✅': 'ok', '⚠️': 'warn', '⚠': 'warn', '❌': 'fail', '⏳': 'ramp' }

/** A markdown table row's cells, honouring `\|` as a literal pipe. */
function cells(line: string): string[] | null {
  const t = line.trim()
  if (!t.startsWith('|') || !t.endsWith('|')) return null
  return t
    .slice(1, -1)
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'))
}

/** The text between a `## n.` heading and the next `## ` heading. */
function section(md: string, number: string): string {
  const start = md.search(new RegExp(`^## ${number}\\.`, 'm'))
  if (start < 0) return ''
  const rest = md.slice(start + 3)
  const next = rest.search(/^## /m)
  return next < 0 ? md.slice(start) : md.slice(start, start + 3 + next)
}

/** The blueprint's contracts, by id: `| C-F1 | wording |`. */
export function parseBlueprintContracts(md: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const line of md.split('\n')) {
    const c = cells(line)
    if (!c || c.length < 2) continue
    const id = c[0].replace(/\*/g, '')
    if (/^C-[A-Z]\d+$/.test(id) && !out.has(id)) out.set(id, c[1])
  }
  return out
}

export interface ParsedCalibration {
  rows: ContractRow[]
  fixes: FixRow[]
  /** The roll-up the document states, or null when it states none. */
  docTally: Record<ContractState, number> | null
  /** Contract ids in §2 whose state symbol could not be read. */
  unread: string[]
}

export function parseCalibration(md: string, contracts: ReadonlyMap<string, string>): ParsedCalibration {
  const rows: ContractRow[] = []
  const unread: string[] = []
  const states = section(md, '2')
  for (const line of states.split('\n')) {
    const c = cells(line)
    if (!c || c.length < 3 || !/^C-[A-Z]\d+$/.test(c[0])) continue
    const sym = Object.keys(SYMBOL).find((k) => c[1].startsWith(k))
    if (!sym) {
      unread.push(c[0])
      continue
    }
    rows.push({
      id: c[0],
      state: SYMBOL[sym],
      contract: contracts.get(c[0]) ?? '',
      evidence: c.slice(2).join(' | '),
      layer: c[0][2],
    })
  }

  const fixes: FixRow[] = []
  for (const line of section(md, '3').split('\n')) {
    const c = cells(line)
    if (!c || c.length < 3 || !/C-[A-Z]\d+/.test(c[0])) continue
    fixes.push({ ids: c[0], gap: c[1], fix: c.slice(2).join(' | ') })
  }

  const m = states.match(/\*\*计数\*\*[：:]\s*✅\s*(\d+)\s*⚠️?\s*(\d+)\s*❌\s*(\d+)\s*⏳\s*(\d+)/)
  const docTally = m ? { ok: Number(m[1]), warn: Number(m[2]), fail: Number(m[3]), ramp: Number(m[4]) } : null
  return { rows, fixes, docTally, unread }
}

export function tallyText(t: Record<ContractState, number>): string {
  const sum = t.ok + t.warn + t.fail + t.ramp
  return `✅ ${t.ok} · ⚠️ ${t.warn} · ❌ ${t.fail} · ⏳ ${t.ramp} = ${sum}`
}

/** Why the panel is drawn — the two roll-ups, side by side, and no story about them. */
export function countNote(doc: Record<ContractState, number>, row: Record<ContractState, number>): string {
  return (
    `The document states ${tallyText(doc)}. Reading its per-layer tables row by row gives ${tallyText(row)}. ` +
    'This page shows the row states, because the rows carry their evidence; the document should reconcile the two.'
  )
}
