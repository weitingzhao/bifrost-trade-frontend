import type { PlaybookCase, PlaybookNote, PlaybookRule } from '@/api/playbook'

export type PlaybookTab = 'rules' | 'notes' | 'cases' | 'search'

export const CATEGORIES = [
  'general',
  'entry',
  'exit',
  'sizing',
  'hedge',
  'risk',
  'regime',
  'instrument',
] as const

/**
 * The sentence beside the tab control — the design's hint, with counts read
 * from the fetched lists. Null while the active tab's list has not answered,
 * so the hint never states a zero it has not read.
 */
export function tabHint(
  tab: PlaybookTab,
  data: { rules?: PlaybookRule[]; notes?: PlaybookNote[]; cases?: PlaybookCase[] },
): string | null {
  if (tab === 'search') return 'searches rules and notes'
  if (tab === 'rules') {
    if (!data.rules) return null
    const active = data.rules.filter((r) => r.active !== false).length
    return `${active} active — what Copilot reads back`
  }
  if (tab === 'notes') {
    if (!data.notes) return null
    return `${data.notes.length} notes — observations not yet rules`
  }
  if (!data.cases) return null
  return `${data.cases.length} case studies — click to open lessons`
}

/** The only date a rule carries is updated_at; "added" would overclaim. */
export function ruleMeta(rule: Pick<PlaybookRule, 'updated_at'>): string | null {
  const day = rule.updated_at?.slice(0, 10)
  return day ? `updated ${day}` : null
}

/** A note filed today reads as its time; any other day reads as the date. */
export function noteWhen(createdAt: string | null | undefined, nowIso: string): string | null {
  if (!createdAt || createdAt.length < 10) return null
  const day = createdAt.slice(0, 10)
  if (day !== nowIso.slice(0, 10)) return day
  const time = createdAt.slice(11, 16)
  return time ? `today ${time}Z` : day
}

/**
 * LOSS reads as a loss; anything else — win and scratch alike — is the book
 * working, which is the design's own two-tone reading.
 */
export function outcomeTone(outcome: string | null | undefined): 'loss' | 'win' {
  return /loss/i.test(outcome ?? '') ? 'loss' : 'win'
}

/**
 * A case stores one markdown field. Its first line is the card's headline and
 * the rest is the lede — both read the same field, nothing is invented.
 */
export function caseHeadline(lessonsMd: string): { title: string; lede: string } {
  const lines = lessonsMd.split('\n').map((l) => l.trim())
  const firstIdx = lines.findIndex((l) => l.length > 0)
  if (firstIdx < 0) return { title: '(empty case)', lede: '' }
  const strip = (l: string) =>
    l
      .replace(/^#{1,6}\s*/, '')
      .replace(/^[-*→]\s*/, '')
      .replace(/\*\*/g, '')
  const title = strip(lines[firstIdx])
  const lede = lines
    .slice(firstIdx + 1)
    .filter((l) => l.length > 0)
    .map(strip)
    .join(' ')
  return { title, lede }
}

/** "filed 2026-01-31" — the day the case entered the book. */
export function caseMeta(c: Pick<PlaybookCase, 'created_at'>): string | null {
  const day = c.created_at?.slice(0, 10)
  return day ? `filed ${day}` : null
}

/** A case can only send you to its trade when it actually names one. */
export function hasTradeRef(c: Pick<PlaybookCase, 'trade_ref'>): boolean {
  return Boolean(c.trade_ref && Object.keys(c.trade_ref).length > 0)
}
