/**
 * Calendar · Decisions (past) — what the Owner decided, from the stores the
 * Journal joins: drafts approved or dismissed (a verdict on a card) and
 * hypotheses opened. Owner plan #18: dated as the Journal dates them, by the
 * artifact's `created_at` — the store keeps no "decided at" a reader can get
 * (`research.ai_action_log` has no read endpoint), so a batch of verdicts
 * lands on the day its drafts were written.
 *
 * Day: New York, from `created_at` — the day the Journal files the same
 * artifact under (`journalModel.dayOf` = `etDayOf`, Owner 2026-10-04), so a
 * Decisions item's `?view=day&day=` opens the Journal on its own day.
 *
 * Pending drafts are not decisions; expired drafts are not read (the Journal
 * does not read them either). Every page of approved and dismissed drafts is
 * read; the hypotheses are the Hypothesis Board's own read.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listAllResearchDrafts, type AiDraft } from '@/api/researchDrafts'
import type { Hypothesis } from '@/api/researchHypothesis'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { etDayOf } from '@/lib/freshness'
import { draftTitle } from '@/lib/harness/draftText'
import { readStr, readStrings } from '@/lib/readUnknown'
import { layerStateOf, type CalendarItem, type CalendarLayerReading } from './calendarLayers'

/** The Hypothesis Board's read — the same key, so the Calendar shares its cache. */
export const BOARD_HYPOTHESES = { include_retired: true, limit: 100 } as const

/** The New York day of a stamp — the Journal's own rule (`etDayOf`); null when it does not parse. */
export function nyDayOf(iso: string | null | undefined): string | null {
  return etDayOf(iso) || null
}

function draftSyms(d: AiDraft): string[] {
  const p = d.payload ?? {}
  const one = readStr(p.symbol)
  return [...new Set([...(one ? [one] : []), ...readStrings(p.symbols)].map((s) => s.trim().toUpperCase()).filter(Boolean))]
}

export function decisionItems(drafts: readonly AiDraft[], hypotheses: readonly Hypothesis[]): CalendarItem[] {
  const out: CalendarItem[] = []
  for (const d of drafts) {
    if (d.status !== 'approved' && d.status !== 'dismissed') continue
    const day = nyDayOf(d.created_at)
    if (!day) continue
    out.push({
      key: `decisions:draft:${d.id}`,
      d: day,
      layer: 'decisions',
      cell: '',
      text: `${d.status} · ${d.kind.replace(/_/g, ' ')} · ${draftTitle(d)}`,
      syms: draftSyms(d),
      ink: 'soft',
      to: `/research/journal?view=day&day=${day}`,
    })
  }
  for (const h of hypotheses) {
    const day = nyDayOf(h.created_at)
    if (!day) continue
    out.push({
      key: `decisions:hypothesis:${h.id}`,
      d: day,
      layer: 'decisions',
      cell: '',
      text: `hypothesis opened · ${h.title}`,
      syms: h.symbols.map((s) => s.toUpperCase()),
      ink: 'soft',
      to: `/research/journal?view=day&day=${day}`,
    })
  }
  return out.sort((a, b) => a.d.localeCompare(b.d))
}

export function useCalendarDecisions(): CalendarLayerReading {
  const drafts = useQuery({
    queryKey: [...QUERY_KEYS.researchEngine.drafts, 'calendar', 'decided'],
    queryFn: async () => {
      const [approved, dismissed] = await Promise.all([
        listAllResearchDrafts({ status: 'approved' }),
        listAllResearchDrafts({ status: 'dismissed' }),
      ])
      return [...approved.rows, ...dismissed.rows]
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
  const hyps = useHypothesisList(BOARD_HYPOTHESES)
  const items = useMemo(
    () => decisionItems(drafts.data ?? [], hyps.data?.rows ?? []),
    [drafts.data, hyps.data?.rows],
  )
  const state = layerStateOf([drafts, hyps])
  const hypFloor = (hyps.data?.rows.length ?? 0) >= BOARD_HYPOTHESES.limit
  return {
    layer: 'decisions',
    items,
    state,
    floor: hypFloor,
    note:
      state === 'signed-out'
        ? 'Research needs the signed-in user — the decisions are unread, not absent.'
        : state === 'failed'
          ? 'The drafts or hypotheses read failed — no decision was placed.'
          : 'Dated by when the draft or hypothesis was written (created_at), as the Journal dates them — the store keeps no decided-at.',
  }
}
