/**
 * The narrative column's deterministic readings, shaped for the pages that
 * quote them beside a measured one: the Stock screen's Catalyst stage and the
 * Symbol page's Narrative panel (design Rev .43 Q7). The Narrative page itself
 * lists the tags; these two only ask "which names" and "which rows for this
 * name", so both questions are answered here, once.
 *
 * Every reading is a filing fact — an SEC item number, or the vendor's label as
 * a second word — and none carries a confidence. They sit beside a verdict and
 * never enter a composite (Narrative page, rules 1 and 3).
 */
import type { NarrativeTag } from '@/api/research/narrative'

/** The window both readers quote. */
export const NARRATIVE_WINDOW_DAYS = 7

export interface NarrativeCondition {
  id: string
  label: string
  /** The SEC item the condition is, or null for "any 8-K". */
  item: string | null
  desc: string
}

/**
 * The four 8-K conditions the design adds to the Catalyst stage, in its order
 * and with its ids and words.
 */
export const NARRATIVE_CONDITIONS: readonly NarrativeCondition[] = [
  {
    id: 'n8k_202_7d',
    label: 'Earnings 8-K · 2.02',
    item: '2.02',
    desc: 'Item 2.02 Results of Operations filed in the last 7 days',
  },
  {
    id: 'n8k_101_7d',
    label: 'Material agreement · 1.01',
    item: '1.01',
    desc: 'Item 1.01 Entry into a Material Definitive Agreement filed in the last 7 days',
  },
  {
    id: 'n8k_502_7d',
    label: 'Officer change · 5.02',
    item: '5.02',
    desc: 'Item 5.02 Departure / appointment of directors or officers filed in the last 7 days',
  },
  {
    id: 'n8k_any_7d',
    label: 'Any 8-K · 7d',
    item: null,
    desc: 'Any 8-K filed in the last 7 days, whatever the item',
  },
]

export function isNarrativeCondition(id: string): boolean {
  return NARRATIVE_CONDITIONS.some((c) => c.id === id)
}

/**
 * The names each condition passes, from one read of the window.
 *
 * An item condition counts SEC-item rows only: the vendor's label is a second
 * word for a filing, never the index. "Any 8-K" counts every row, because
 * each row — item or label — is a filing in the window. The server leaves out
 * exhibit-only items (9.01), which never file alone.
 */
export function namesByCondition(tags: readonly NarrativeTag[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>(NARRATIVE_CONDITIONS.map((c) => [c.id, new Set<string>()]))
  for (const t of tags) {
    for (const c of NARRATIVE_CONDITIONS) {
      if (c.item == null || (t.basis === 'sec' && t.item === c.item)) out.get(c.id)?.add(t.symbol)
    }
  }
  return out
}

/** Names passing **any** of the picked conditions (the stage is "any selected"). */
export function namesPassing(byCondition: Map<string, Set<string>>, picked: Iterable<string>): Set<string> {
  const out = new Set<string>()
  for (const id of picked) for (const s of byCondition.get(id) ?? []) out.add(s)
  return out
}

export interface NarrativeRow {
  item: string | null
  /** "Results of operations — …", the reading and what the filing says. */
  what: string
  basis: string
  date: string
  href: string | null
  accession: string
}

/**
 * One name's rows, newest first: one per SEC item, with the vendor's label
 * folded in as the second word on the same filing rather than as a row of its
 * own — two rows for one filing would read as two events.
 */
export function rowsForSymbol(tags: readonly NarrativeTag[], symbol: string): NarrativeRow[] {
  const mine = tags.filter((t) => t.symbol === symbol)
  const labelled = new Map<string, string>()
  for (const t of mine) {
    if (t.basis === 'vendor' && !labelled.has(t.accession)) labelled.set(t.accession, t.reading)
  }
  const sec = mine.filter((t) => t.basis === 'sec')
  const covered = new Set(sec.map((t) => t.accession))
  const rows: NarrativeRow[] = sec.map((t) => ({
    item: t.item,
    what: t.quote ? `${t.reading} — ${t.quote}` : t.reading,
    basis: labelled.has(t.accession)
      ? `SEC item · vendor label “${labelled.get(t.accession)}” beside it`
      : 'SEC item · deterministic, no confidence',
    date: t.filing_date,
    href: t.filing_url,
    accession: t.accession,
  }))
  // A filing the vendor labelled and no SEC item reached (an exhibit-only
  // body) still happened: it keeps a row, marked as the vendor's word.
  for (const t of mine) {
    if (t.basis !== 'vendor' || covered.has(t.accession)) continue
    covered.add(t.accession)
    rows.push({
      item: null,
      what: t.quote ? `${t.reading} — ${t.quote}` : t.reading,
      basis: 'vendor classification · a second label, never the index',
      date: t.filing_date,
      href: t.filing_url,
      accession: t.accession,
    })
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}
