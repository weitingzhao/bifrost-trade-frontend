/**
 * A card's headline, cut out of what the model wrote (design Rev .143 #4).
 *
 * Hypothesis titles arrive as one sentence with the symbol and the setup code
 * welded to the claim — `NVDA STAGE_2A PIVOT — dealer gamma pins price…`. The
 * card reads better as three things in three places: the symbol in ticker ink,
 * the claim as the title, the setup code on the meta line.
 *
 * The prototype's cut handles `SYM CODE — claim` and `SYM: claim`. Measured on
 * DEV (2026-10-04, 64 hypotheses) a third shape is common and the prototype
 * mangles it: the loop's own `Daily Loop Stock Explorer · AVT (run_…) — TRACKING,
 * falsification fails` (12 of the 42 a call card resolves to) — its first word
 * is `Daily`, so the symbol was lost and, with no ` — `, the whole string was
 * the title. That shape is cut first.
 */
import type { AiDraft } from '@/api/researchDrafts'
import { draftTitle } from '@/lib/harness/draftText'
import { formatPolicyLeaf, policyDiffView } from '@/lib/harness/policyDiff'
import { isObjectivePatch } from '@/lib/harness/writesTo'

export interface DraftHeadline {
  /** The symbol the title is about, drawn in ticker ink. */
  sym: string | null
  /** `Stage 2A pivot` — the setup code, for the meta line. */
  setup: string | null
  /** The objective named in a loop-written title, for the meta line. */
  objective: string | null
  title: string
}

const TICKER = /^[A-Z]{1,5}(?:\.[A-Z])?$/
/** `<objective> · SYM (run_…) — claim`, the run id and the claim both optional. */
const LOOP_TITLE = /^(.+?) · ([A-Z]{1,5}(?:\.[A-Z])?)(?: \(run_[0-9a-f]+\))?(?: — (.+))?$/
const COLON_TITLE = /^([A-Z]{1,5}(?:\.[A-Z])?): (.+)$/
const DASH = ' — '

/** `STAGE_2A` → `Stage 2A`; any other code → its words, lowercase. */
export function setupWords(code: string): string {
  return code
    .split(' ')
    .filter(Boolean)
    .map((w) => {
      const m = /^STAGE_(\d)([A-Z])$/.exec(w)
      return m ? `Stage ${m[1]}${m[2]}` : w.replace(/_/g, ' ').toLowerCase()
    })
    .join(' ')
}

function capitalised(text: string): string {
  const t = text.trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t
}

/** Cut a model-written title into symbol · setup · claim. */
export function splitHeadline(raw: string): DraftHeadline {
  const text = raw.trim()
  const loop = LOOP_TITLE.exec(text)
  if (loop) {
    const [, objective, sym, claim] = loop
    // Without a claim the objective is all the title there is; with one it
    // moves to the meta line, where provenance belongs.
    return claim
      ? { sym, setup: null, objective, title: capitalised(claim) }
      : { sym, setup: null, objective: null, title: objective }
  }
  const dash = text.indexOf(DASH)
  if (dash > 0) {
    const head = text.slice(0, dash).split(' ')
    // Only when the head starts with a symbol: otherwise the head is part of
    // the sentence, and dropping it would lose words the model wrote.
    if (TICKER.test(head[0])) {
      const setup = setupWords(head.slice(1).join(' '))
      return { sym: head[0], setup: setup || null, objective: null, title: capitalised(text.slice(dash + DASH.length)) }
    }
  }
  const colon = COLON_TITLE.exec(text)
  if (colon) return { sym: colon[1], setup: null, objective: null, title: capitalised(colon[2]) }
  return { sym: null, setup: null, objective: null, title: text }
}

/** At most this many changed fields in a patch's title; the card's diff has the rest. */
const PATCH_TITLE_FIELDS = 2

/**
 * An objective patch's title: `Objective name · field from → to` (Rev .143 #4).
 * The suggestion carries no title of its own, so the card used to print the
 * scope slug `objective:obj-daily-loop-stock` as its headline. The diff is the
 * merge the server would make (`policyDiffView`), not the suggestion's raw keys.
 */
export function objectivePatchTitle(payload: Record<string, unknown>, objectiveName: string): string {
  const { changes } = policyDiffView(payload)
  if (changes.length === 0) return `${objectiveName} · no field would change`
  const shown = changes
    .slice(0, PATCH_TITLE_FIELDS)
    .map((c) => `${c.path} ${formatPolicyLeaf(c.from)} → ${formatPolicyLeaf(c.to)}`)
    .join(', ')
  const more = changes.length - PATCH_TITLE_FIELDS
  return more > 0 ? `${objectiveName} · ${shown} · +${more} more` : `${objectiveName} · ${shown}`
}

/** A playbook note's first line, without its markdown heading marks. */
function noteFirstLine(payload: Record<string, unknown>): string | null {
  const md = typeof payload.note_md === 'string' ? payload.note_md : ''
  const line = md.split('\n').find((l) => l.trim())
  if (!line) return null
  return line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim() || null
}

/**
 * The headline for a card.
 *
 * `objectiveName` resolves an objective id to its title; the slug stands in
 * when the objective is not in the list (an archived one, for instance).
 */
export function draftHeadline(
  draft: Pick<AiDraft, 'kind' | 'payload' | 'scope'>,
  opts: { hypothesisTitle?: string | null; objectiveName?: (id: string) => string | null } = {},
): DraftHeadline {
  const p = draft.payload
  const hasTitle = typeof p.title === 'string' && p.title.trim() !== ''
  if (isObjectivePatch(draft.kind, draft.scope) && !hasTitle) {
    const id = draft.scope.slice('objective:'.length)
    const name = opts.objectiveName?.(id) ?? id
    return { sym: null, setup: null, objective: null, title: objectivePatchTitle(p, name) }
  }
  if (draft.kind === 'playbook_note' && !hasTitle) {
    const line = noteFirstLine(p)
    if (line) return splitHeadline(line)
  }
  return splitHeadline(draftTitle(draft, opts.hypothesisTitle))
}
