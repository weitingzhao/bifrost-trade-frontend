/**
 * Chips and the summary line for the hub views — research-loop-automation D4.
 *
 * One chip per thing Copilot or the Loop said about the symbol: a lens band
 * from the digest, what the leash decided, a split among the judges, a
 * resolution, and every chat-side proposal with its approval state. The
 * proposals can run to dozens, so the strip shows them as one line
 * (`verdictSummary`) and keeps their chips behind a disclosure.
 */
import type { ProposalKind, SymbolProposal, SymbolVerdicts } from '@/api/research/symbolVerdicts'
import { labelForBand, toneForBand } from '@/lib/lensVerdict'
import { withSymbolParam } from '@/lib/symbolLink'

export type ChipTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

export interface VerdictChip {
  key: string
  label: string
  tone: ChipTone
  /** The detail behind the chip — shown on hover. */
  title: string
  /** Where the same thing is decided or read in full. */
  to?: string
}

function toneOfVerdict(tone: string): ChipTone {
  return tone === 'danger' || tone === 'warning' || tone === 'success' ? tone : 'neutral'
}

export function proposalTone(p: Pick<SymbolProposal, 'kind' | 'status'>): ChipTone {
  const s = p.status ?? ''
  if (p.kind === 'candidate')
    return s === 'promoted' ? 'success' : s === 'open' ? 'info' : 'neutral'
  if (p.kind === 'hypothesis')
    return s === 'validated'
      ? 'success'
      : s === 'rejected'
        ? 'danger'
        : s === 'active'
          ? 'info'
          : 'neutral'
  if (p.kind === 'draft')
    return s === 'pending' ? 'warning' : s === 'approved' ? 'success' : 'neutral'
  return s === 'executed'
    ? 'success'
    : s === 'error' || s === 'rejected'
      ? 'danger'
      : s === 'proposed' || s === 'approved'
        ? 'warning'
        : 'neutral'
}

export function proposalPath(p: SymbolProposal, symbol: string): string {
  if (p.kind === 'candidate') return withSymbolParam('/research/loop/candidates', symbol)
  if (p.kind === 'hypothesis') return withSymbolParam('/research/loop/hypotheses', symbol)
  return '/research/loop/decisions'
}

export function proposalLabel(p: SymbolProposal): string {
  const who = p.by_copilot ? 'Copilot' : (p.source ?? p.generated_by ?? 'Loop')
  if (p.kind === 'candidate') return `Candidate · ${p.state} (${who})`
  if (p.kind === 'hypothesis') return `Hypothesis · ${p.state}${p.by_rule ? ' by rule' : ''}`
  if (p.kind === 'draft') return `${(p.draft_kind ?? 'draft').replace(/_/g, ' ')} · ${p.state}`
  return `${p.title ?? p.tool ?? 'chat action'} · ${p.state}`
}

/** The digest's lens lines — the band in the lab's own words, the meaning on hover. */
export function lensChips(data: SymbolVerdicts | undefined): VerdictChip[] {
  const d = data?.digest
  if (!d) return []
  const chips: VerdictChip[] = []
  for (const ln of d.lenses) {
    if (!ln.band) continue
    chips.push({
      key: `lens-${ln.lens}`,
      label: `${ln.lens}: ${labelForBand(ln.lens, ln.band)}`,
      tone: toneOfVerdict(toneForBand(ln.lens, ln.band)),
      title: `${d.day ?? 'digest'} · ${ln.means ?? ln.band}${ln.as_of ? ` · as of ${ln.as_of}` : ''}`,
    })
  }
  return chips
}

/** What the Loop decided about the symbol: the leash, a judges' split, a resolution. */
export function decisionChips(data: SymbolVerdicts | undefined): VerdictChip[] {
  const d = data?.digest
  if (!d) return []
  const chips: VerdictChip[] = []
  const b = d.batches[0]
  if (b) {
    chips.push(
      b.auto_accepted
        ? {
            key: 'leash',
            label: 'Auto-accepted by the leash',
            tone: 'success',
            title: `${b.objective_title ?? 'Loop'} · run ${b.run_id ?? '?'}`,
            to: b.run_id ? `/research/loop/harness?run=${encodeURIComponent(b.run_id)}` : undefined,
          }
        : b.held_reasons.length > 0
          ? {
              key: 'leash',
              label: `Held: ${b.held_reasons[0]}`,
              tone: 'warning',
              title: b.held_reasons.join(' · '),
              to: '/research/loop/decisions',
            }
          : {
              key: 'leash',
              label: `Proposed by ${b.objective_title ?? 'the Loop'}`,
              tone: 'info',
              title: `run ${b.run_id ?? '?'} · ${b.status ?? ''}`,
              to: '/research/loop/decisions',
            }
    )
  }
  if (d.dissent) {
    chips.push({
      key: 'dissent',
      label: 'Judges split',
      tone: 'danger',
      title: `${(d.dissent.judges ?? []).join(' · ')}${d.dissent.wrong_if?.length ? ` · wrong if: ${d.dissent.wrong_if.join('; ')}` : ''}`,
      to: '/research/loop/decisions',
    })
  }
  if (d.resolution) {
    const st = d.resolution.status ?? 'resolved'
    chips.push({
      key: 'resolution',
      label: `Hypothesis ${st}${d.resolution.by_rule ? ' by rule' : ''}`,
      tone: st === 'validated' ? 'success' : st === 'rejected' ? 'danger' : 'neutral',
      title: `${d.resolution.title ?? ''}${typeof d.resolution.excess === 'number' ? ` · excess ${(d.resolution.excess * 100).toFixed(1)}%` : ''}`,
      to: '/research/loop/hypotheses',
    })
  }
  return chips
}

/** One chip per proposal, in the API's order (newest first). */
export function proposalChips(data: SymbolVerdicts | undefined): VerdictChip[] {
  if (!data) return []
  return data.proposals.map((p, i) => ({
    key: `${p.kind}-${p.id ?? p.created_at ?? i}`,
    label: proposalLabel(p),
    tone: proposalTone(p),
    title: `${p.title ?? ''}${p.created_at ? ` · ${p.created_at.slice(0, 16).replace('T', ' ')}` : ''}${p.approved_by ? ` · by ${p.approved_by}` : ''}`,
    to: proposalPath(p, data.symbol),
  }))
}

/** Every chip in reading order — lenses, decisions, proposals. */
export function verdictChips(data: SymbolVerdicts | undefined): VerdictChip[] {
  return [...lensChips(data), ...decisionChips(data), ...proposalChips(data)]
}

const KIND_ORDER: readonly ProposalKind[] = ['candidate', 'hypothesis', 'draft', 'action']
const PLURAL: Record<ProposalKind, string> = {
  candidate: 'candidates',
  hypothesis: 'hypotheses',
  draft: 'drafts',
  action: 'actions',
}
/** The status that means a proposal is still in play, and the word the summary uses for it. */
const IN_PLAY: Record<ProposalKind, { status: readonly string[]; word: string }> = {
  candidate: { status: ['open'], word: 'open' },
  hypothesis: { status: ['active'], word: 'active' },
  draft: { status: ['pending'], word: 'pending' },
  action: { status: ['proposed', 'approved'], word: 'awaiting' },
}
/** In play *and* waiting on a person — an approved action only waits on its executor. */
const WAITING: Record<ProposalKind, readonly string[]> = {
  candidate: ['open'],
  hypothesis: [],
  draft: ['pending'],
  action: ['proposed'],
}

export interface VerdictSummary {
  total: number
  /** One part per kind present: "5 candidates (1 open)". */
  parts: string[]
  /** Proposals still waiting on a decision. */
  waiting: number
  /** The newest proposal — the last thing that happened. */
  last: { label: string; day: string | null; to: string } | null
}

/** The proposals folded into one line: counts by kind, what still waits, what happened last. */
export function verdictSummary(data: SymbolVerdicts | undefined): VerdictSummary {
  const proposals = data?.proposals ?? []
  const parts: string[] = []
  let waiting = 0
  for (const kind of KIND_ORDER) {
    const of = proposals.filter((p) => p.kind === kind)
    if (of.length === 0) continue
    const inPlay = of.filter((p) => IN_PLAY[kind].status.includes(p.status ?? '')).length
    waiting += of.filter((p) => WAITING[kind].includes(p.status ?? '')).length
    const noun = of.length === 1 ? kind : PLURAL[kind]
    parts.push(
      inPlay > 0 ? `${of.length} ${noun} (${inPlay} ${IN_PLAY[kind].word})` : `${of.length} ${noun}`
    )
  }
  let newest: SymbolProposal | undefined
  for (const p of proposals) {
    if (!newest || (p.created_at ?? '') > (newest.created_at ?? '')) newest = p
  }
  return {
    total: proposals.length,
    parts,
    waiting,
    last:
      newest && data
        ? {
            label: proposalLabel(newest),
            day: newest.created_at?.slice(0, 10) ?? null,
            to: proposalPath(newest, data.symbol),
          }
        : null,
  }
}
