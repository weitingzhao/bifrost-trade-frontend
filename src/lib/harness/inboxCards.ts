/**
 * The Decisions stream as cards, before it is drawn (design Rev .143).
 *
 * One card is one question for the Owner, not one row of `ai_draft`:
 *
 * - **call** — a hypothesis's `decision_draft` (the verdict) and
 *   `order_intent` (the vehicle) are one call (#2). The curator posts them as
 *   two drafts; on DEV 12 hypotheses carry both. The newest of each heads the
 *   card and older ones fold under it. Record answer answers every draft on
 *   the card. A blank `hypothesis_id` never merges: on DEV four call drafts
 *   from 09-23 carry an empty one, and keying on it would make one card of
 *   four unrelated calls.
 * - **objective** — a `candidate_batch` or an objective `patch` from the same
 *   objective: the newest run covers the earlier ones, whatever names they
 *   proposed (#5; patches by Owner 2026-10-04 #12). The earlier ones fold
 *   under it. This replaces the 09-01 rule that merged only identical symbol
 *   sets, which on DEV left 39 batches as 19 cards for 2 objectives.
 * - **single** — everything else, one draft per card.
 *
 * Earlier runs the reader hid in this browser (`hidden`) leave the fold. They
 * stay pending on the server: "Dismiss earlier" collapses them here and sends
 * nothing (Owner 2026-10-04 #11), because a server dismiss of a batch also
 * marks its open names dismissed in the candidate pool, and those are names
 * the reader never looked at.
 */
import type { AiDraft } from '@/api/researchDrafts'
import { kindTag } from '@/lib/harness/draftText'
import { isActionableDraft, isDecisionKind } from '@/lib/harness/harnessDraftHelpers'
import { isObjectivePatch, writesTo, WRITES_TO_ORDER, type WritesTo } from '@/lib/harness/writesTo'

export type InboxCardShape = 'call' | 'objective' | 'single'

export interface InboxCard {
  /** Stable across refetches: `call:<hypothesis>` · `pool:<objective>` · `patch:<objective>` · `draft:<id>`. */
  key: string
  shape: InboxCardShape
  dest: WritesTo
  tag: string
  /** The draft the card is drawn from: the verdict of a call when there is one, else the newest. */
  head: AiDraft
  /** Call cards only: the newest verdict and the newest vehicle. */
  verdict: AiDraft | null
  vehicle: AiDraft | null
  /** What the card's answer is sent to — every draft of a call, the head alone otherwise. */
  answers: AiDraft[]
  /** Earlier drafts folded under the head, newest first (hidden ones left out). */
  folded: AiDraft[]
  /** Earlier drafts the reader hid in this browser. */
  hiddenEarlier: AiDraft[]
  /** Newest `created_at` on the card, epoch ms. */
  newestAt: number
}

function ms(d: AiDraft): number {
  const t = Date.parse(d.created_at)
  return Number.isFinite(t) ? t : 0
}

function newestFirst(a: AiDraft, b: AiDraft): number {
  return ms(b) - ms(a) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
}

function nonEmpty(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** The objective a draft belongs to, for the kinds that fold by objective. */
function objectiveOf(d: AiDraft): string | null {
  const scoped = d.scope.startsWith('objective:') ? nonEmpty(d.scope.slice('objective:'.length)) : null
  return nonEmpty(d.payload.objective_id) ?? scoped
}

/** The card a draft belongs to. */
export function inboxCardKey(d: AiDraft): string {
  if (d.kind === 'decision_draft' || d.kind === 'order_intent') {
    const hyp = nonEmpty(d.payload.hypothesis_id)
    if (hyp) return `call:${hyp}`
  }
  if (d.kind === 'candidate_batch') {
    const obj = objectiveOf(d)
    if (obj) return `pool:${obj}`
  }
  if (isObjectivePatch(d.kind, d.scope)) {
    const obj = objectiveOf(d)
    if (obj) return `patch:${obj}`
  }
  return `draft:${d.id}`
}

function callCard(key: string, members: AiDraft[]): InboxCard {
  const sorted = members.slice().sort(newestFirst)
  const verdict = sorted.find((d) => d.kind === 'decision_draft') ?? null
  const vehicle = sorted.find((d) => d.kind === 'order_intent') ?? null
  const head = (verdict ?? vehicle) as AiDraft
  return {
    key,
    shape: 'call',
    dest: 'nothing',
    tag: 'call',
    head,
    verdict,
    vehicle,
    answers: sorted,
    folded: sorted.filter((d) => d !== verdict && d !== vehicle),
    hiddenEarlier: [],
    newestAt: ms(sorted[0]),
  }
}

/**
 * The newest run the reader has not hidden heads the card. When every run of
 * an objective is hidden there is no card — they are still pending on the
 * server, and the page says how many are hidden and offers them back.
 */
function objectiveCard(key: string, members: AiDraft[], hidden: ReadonlySet<string>): InboxCard | null {
  const sorted = members.slice().sort(newestFirst)
  const visible = sorted.filter((d) => !hidden.has(d.id))
  if (visible.length === 0) return null
  const [head, ...rest] = visible
  return {
    key,
    shape: 'objective',
    dest: writesTo(head.kind, head.scope) ?? 'nothing',
    tag: kindTag(head.kind, head.scope),
    head,
    verdict: null,
    vehicle: null,
    answers: [head],
    folded: rest,
    hiddenEarlier: sorted.filter((d) => hidden.has(d.id)),
    newestAt: ms(head),
  }
}

function singleCard(d: AiDraft): InboxCard {
  return {
    key: `draft:${d.id}`,
    shape: 'single',
    // A kind no place owns falls through to the server's advisory branch,
    // which writes nothing — so it is drawn where the calls are.
    dest: writesTo(d.kind, d.scope) ?? 'nothing',
    tag: kindTag(d.kind, d.scope),
    head: d,
    verdict: null,
    vehicle: null,
    answers: [d],
    folded: [],
    hiddenEarlier: [],
    newestAt: ms(d),
  }
}

/** Decision drafts hidden in this browser (any objective), for the page's "Show again". */
export function hiddenDecisionCount(rows: readonly AiDraft[], hidden: ReadonlySet<string>): number {
  return rows.filter((d) => hidden.has(d.id) && isDecisionKind(d.kind)).length
}

/** The decision drafts as cards, newest card first. Briefings are not cards here. */
export function buildInboxCards(rows: readonly AiDraft[], hidden: ReadonlySet<string> = new Set()): InboxCard[] {
  const groups = new Map<string, AiDraft[]>()
  for (const d of rows) {
    if (!isDecisionKind(d.kind)) continue
    const key = inboxCardKey(d)
    const g = groups.get(key)
    if (g) g.push(d)
    else groups.set(key, [d])
  }
  const cards: InboxCard[] = []
  for (const [key, members] of groups) {
    if (key.startsWith('call:')) cards.push(callCard(key, members))
    else if (key.startsWith('pool:') || key.startsWith('patch:')) {
      const card = objectiveCard(key, members, hidden)
      if (card) cards.push(card)
    } else cards.push(singleCard(members[0]))
  }
  return cards.sort((a, b) => b.newestAt - a.newestAt || (a.key < b.key ? -1 : 1))
}

/**
 * Whether answering this card writes anything. A call writes nothing (D10), a
 * patch whose fields are all unchanged merges nothing; both stay on the page
 * at lower weight rather than moving.
 */
export function cardWrites(card: InboxCard): boolean {
  return card.shape !== 'call' && isActionableDraft(card.head)
}

/** The toast for a dismissed card — the Inbox and the Copilot queue say the same. */
export function cardDismissToast(card: InboxCard): string {
  const n = card.answers.length
  if (card.shape === 'call') return `Call dismissed${n > 1 ? ` (${n} drafts)` : ''}`
  return card.folded.length > 0 ? 'Dismissed — the earlier runs stay pending and fold away here' : 'Draft dismissed'
}

/** The card holding a draft, by any of its drafts' ids — how `?card=` finds it. */
export function cardHoldingDraft(cards: readonly InboxCard[], draftId: string): InboxCard | null {
  return (
    cards.find(
      (c) =>
        c.answers.some((d) => d.id === draftId) ||
        c.folded.some((d) => d.id === draftId) ||
        c.hiddenEarlier.some((d) => d.id === draftId),
    ) ?? null
  )
}

export interface InboxSection<T> {
  dest: WritesTo
  items: T[]
}

/**
 * Group items by where Approve writes, in the design's order (Rules → Policy →
 * Book → Pool → Nothing, Rev .143 #6). Items keep their order inside a section.
 * A `lead` item and its section go first: a deep-linked card is what the
 * reader came for, so the landing never needs a scroll.
 */
export function inboxSections<T>(
  items: readonly T[],
  destOf: (item: T) => WritesTo,
  lead?: (item: T) => boolean,
): InboxSection<T>[] {
  const by = new Map<WritesTo, T[]>()
  for (const it of items) {
    const d = destOf(it)
    const list = by.get(d)
    if (list) list.push(it)
    else by.set(d, [it])
  }
  const sections = WRITES_TO_ORDER.filter((d) => by.has(d)).map((d) => ({ dest: d, items: by.get(d) as T[] }))
  if (!lead) return sections
  const at = sections.findIndex((s) => s.items.some(lead))
  if (at < 0) return sections
  const [hit] = sections.splice(at, 1)
  const card = hit.items.find(lead) as T
  return [{ dest: hit.dest, items: [card, ...hit.items.filter((i) => i !== card)] }, ...sections]
}
