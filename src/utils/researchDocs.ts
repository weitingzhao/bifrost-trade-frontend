/**
 * Reading the repository documents the reference pages render — split into
 * numbered sections, and the Research blueprint's contracts by their stable
 * anchors.
 *
 * Calibration was the first reader of the blueprint parser; the Blueprint page
 * (design Rev .53, contracts grouped by layer) is the second, so it lives here
 * rather than being copied (§14.2).
 */

/** The blueprint's five layers, in its own order: key, title, what it holds. */
export const CONTRACT_LAYERS: readonly [string, string, string][] = [
  ['F', '基础层 · Foundation', 'lenses, registry, universe'],
  ['R', '实绩层 · Record', 'what happened next'],
  ['A', '智囊 · Autopilot', 'judgement layer'],
  ['C', '操作面 · Copilot', 'the desk'],
  ['U', 'UI', 'seat and navigation'],
]

/** A markdown table row's cells, honouring `\|` as a literal pipe. */
export function mdTableCells(line: string): string[] | null {
  const t = line.trim()
  if (!t.startsWith('|') || !t.endsWith('|')) return null
  return t
    .slice(1, -1)
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'))
}

/** The text between a `## n.` heading and the next `## ` heading. */
export function mdSection(md: string, number: string): string {
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
    const c = mdTableCells(line)
    if (!c || c.length < 2) continue
    const id = c[0].replace(/\*/g, '')
    if (/^C-[A-Z]\d+$/.test(id) && !out.has(id)) out.set(id, c[1])
  }
  return out
}

/** A contract id's layer key: `C-F1` → `F`. */
export function contractLayer(id: string): string {
  return id.slice(2, 3)
}

export interface DocSection {
  /** The heading's own number (`1`, `4`), or its position when it has none. */
  n: string
  title: string
  /** A stable in-page anchor, `<prefix>-<n>`. */
  anchor: string
  /** The section's markdown below its heading. */
  body: string
}

export interface SplitDoc {
  /** Everything between the H1 and the first `## `, rules removed. */
  lede: string
  sections: DocSection[]
}

/**
 * A document cut at its `## ` headings. The H1 is dropped (the page head
 * carries the title) and so are bare `---` rules, which the reader draws as
 * section borders instead.
 */
export function splitDocSections(md: string, prefix: string): SplitDoc {
  const lines = md.replace(/^# .*\n+/, '').split('\n')
  const lede: string[] = []
  const sections: DocSection[] = []
  let cur: { head: string; body: string[] } | null = null
  const close = () => {
    if (!cur) return
    const m = cur.head.match(/^(\d+)\.\s+(.*)$/)
    const n = m ? m[1] : String(sections.length + 1)
    sections.push({ n, title: m ? m[2] : cur.head, anchor: `${prefix}-${n}`, body: cur.body.join('\n').trim() })
  }
  for (const line of lines) {
    if (line.startsWith('## ')) {
      close()
      cur = { head: line.slice(3).trim(), body: [] }
    } else if (/^---\s*$/.test(line)) {
      continue
    } else if (cur) {
      cur.body.push(line)
    } else {
      lede.push(line)
    }
  }
  close()
  return { lede: lede.join('\n').trim(), sections }
}
