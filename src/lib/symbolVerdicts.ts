/**
 * Chips for the hub views — research-loop-automation D4.
 *
 * One chip per thing Copilot or the Loop said about the symbol: a lens band
 * from the digest, what the leash decided, a split among the judges, a
 * resolution, and every chat-side proposal with its approval state.
 */
import type { SymbolProposal, SymbolVerdicts } from '@/api/research/symbolVerdicts'
import { labelForBand, toneForBand } from '@/lib/lensVerdict'

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
  if (p.kind === 'candidate') return s === 'promoted' ? 'success' : s === 'open' ? 'info' : 'neutral'
  if (p.kind === 'hypothesis') return s === 'validated' ? 'success' : s === 'rejected' ? 'danger' : s === 'active' ? 'info' : 'neutral'
  if (p.kind === 'draft') return s === 'pending' ? 'warning' : s === 'approved' ? 'success' : 'neutral'
  return s === 'executed' ? 'success' : s === 'error' || s === 'rejected' ? 'danger' : s === 'proposed' || s === 'approved' ? 'warning' : 'neutral'
}

export function proposalPath(p: SymbolProposal, symbol: string): string {
  const sym = encodeURIComponent(symbol)
  if (p.kind === 'candidate') return `/research/loop/candidates?symbol=${sym}`
  if (p.kind === 'hypothesis') return `/research/loop/hypotheses?symbol=${sym}`
  return '/research/loop/decisions'
}

export function proposalLabel(p: SymbolProposal): string {
  const who = p.by_copilot ? 'Copilot' : (p.source ?? p.generated_by ?? 'Loop')
  if (p.kind === 'candidate') return `Candidate · ${p.state} (${who})`
  if (p.kind === 'hypothesis') return `Hypothesis · ${p.state}${p.by_rule ? ' by rule' : ''}`
  if (p.kind === 'draft') return `${(p.draft_kind ?? 'draft').replace(/_/g, ' ')} · ${p.state}`
  return `${p.title ?? p.tool ?? 'chat action'} · ${p.state}`
}

export function verdictChips(data: SymbolVerdicts | undefined): VerdictChip[] {
  if (!data) return []
  const chips: VerdictChip[] = []
  const d = data.digest
  if (d) {
    for (const ln of d.lenses) {
      if (!ln.band) continue
      chips.push({
        key: `lens-${ln.lens}`,
        label: `${ln.lens}: ${labelForBand(ln.lens, ln.band)}`,
        tone: toneOfVerdict(toneForBand(ln.lens, ln.band)),
        title: `${d.day ?? 'digest'} · ${ln.means ?? ln.band}${ln.as_of ? ` · as of ${ln.as_of}` : ''}`,
      })
    }
    const b = d.batches[0]
    if (b) {
      chips.push(
        b.auto_accepted
          ? { key: 'leash', label: 'Auto-accepted by the leash', tone: 'success', title: `${b.objective_title ?? 'Loop'} · run ${b.run_id ?? '?'}`, to: b.run_id ? `/research/loop/harness?run=${encodeURIComponent(b.run_id)}` : undefined }
          : b.held_reasons.length > 0
            ? { key: 'leash', label: `Held: ${b.held_reasons[0]}`, tone: 'warning', title: b.held_reasons.join(' · '), to: '/research/loop/decisions' }
            : { key: 'leash', label: `Proposed by ${b.objective_title ?? 'the Loop'}`, tone: 'info', title: `run ${b.run_id ?? '?'} · ${b.status ?? ''}`, to: '/research/loop/decisions' },
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
  }
  for (const p of data.proposals) {
    chips.push({
      key: `${p.kind}-${p.id ?? p.created_at ?? chips.length}`,
      label: proposalLabel(p),
      tone: proposalTone(p),
      title: `${p.title ?? ''}${p.created_at ? ` · ${p.created_at.slice(0, 16).replace('T', ' ')}` : ''}${p.approved_by ? ` · by ${p.approved_by}` : ''}`,
      to: proposalPath(p, data.symbol),
    })
  }
  return chips
}
