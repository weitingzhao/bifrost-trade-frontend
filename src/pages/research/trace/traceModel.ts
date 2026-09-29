/**
 * Trace (design `Research Trace.dc.html`, Rev .100/.102; Vision §22.5–22.6):
 * one artifact's chain, walked over Journal edges — up to where it came from,
 * down to what it caused. No store of its own; every node is derived.
 *
 * What DEV answers, measured 2026-09-28 (research 0.150.0 and local 0.145.0):
 * a memory carries its evidence (source · date · text · route) and its
 * first/last distill; the portrait's axes name the memories that back them.
 * Downstream (batch V4, Owner 2026-09-28): the Console proposes from a
 * tension or weak-spot memory, and an objective drafted from one records it in
 * `policy_json.origin` — so PROPOSAL, OBJECTIVE, RUNS and VERDICT light from
 * that edge, and stay dashed with the reason where it is absent.
 */
import type { JournalMemory, MemoryAxis, MemoryEvidence } from '@/api/research/journal'

/**
 * Where a source stands against the loop (§22.5). Fills are market facts;
 * notes and visits are your own acts; Inbox decisions and Copilot threads are
 * answers to what the loop itself produced — a memory resting on those alone
 * is the loop hearing its own voice.
 */
export type SourceStanding = 'market' | 'yours' | 'loop'

export const SOURCE_STANDING: Record<string, SourceStanding> = {
  fills: 'market',
  notes: 'yours',
  visits: 'yours',
  decisions: 'loop',
  threads: 'loop',
}

const SOURCE_TO: Record<string, { to: string; label: string }> = {
  fills: { to: '/trade/fills', label: 'Orders & Fills →' },
  notes: { to: '/research/journal', label: 'Journal · Notes →' },
  visits: { to: '/research/journal?view=day', label: 'Journal · Day →' },
  decisions: { to: '/research/loop/decisions', label: 'Decision Inbox →' },
  threads: { to: '/research/loop/harness', label: 'Pilot Console · Conversations →' },
}

export type TraceArc = 'trail' | 'distill' | 'memory' | 'propose' | 'will' | 'run' | 'settle'

export interface TraceKid {
  at: string
  kind: string
  text: string
  to: string | null
}

export interface TraceNode {
  arc: TraceArc
  tag: string
  title: string
  at: string
  sub: string
  kids: TraceKid[]
  /** A walked arc; false draws it dashed — the loop's not-yet. */
  walked: boolean
  go: { to: string; label: string } | null
}

export interface ImmuneReading {
  verdict: 'rooted' | 'yours' | 'echo' | 'empty'
  text: string
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function span(ev: readonly MemoryEvidence[]): string {
  const days = ev.map((e) => e.date).filter(Boolean).sort()
  if (!days.length) return 'undated'
  const a = days[0]
  const b = days[days.length - 1]
  return a === b ? a : `${a} → ${b}`
}

export function immuneCheck(m: JournalMemory): ImmuneReading {
  const standings = new Set(m.evidence.map((e) => SOURCE_STANDING[e.source] ?? 'loop'))
  if (!m.evidence.length)
    return { verdict: 'empty', text: 'This memory carries no evidence the Journal can show, so where it came from cannot be read here.' }
  if (standings.has('market'))
    return {
      verdict: 'rooted',
      text: 'This chain roots in evidence from outside the loop — fills are market facts. A memory that traces only to the loop’s own artifacts is an echo, and this page is where you would see it (Vision §22.5).',
    }
  if (standings.has('yours'))
    return {
      verdict: 'yours',
      text: 'This chain roots in your own acts — notes and visits — not in the market. It says what you attend to, not what the market did (Vision §22.5).',
    }
  return {
    verdict: 'echo',
    text: 'This chain traces only to the loop’s own artifacts — Inbox decisions and Copilot threads answer what the loop produced. That is the echo §22.5 warns about; read it as what the loop hears of itself, not as evidence about the market.',
  }
}

/** Groups the evidence by source, keeping the store's order inside each. */
function trailNodes(m: JournalMemory): TraceNode[] {
  const bySource = new Map<string, MemoryEvidence[]>()
  for (const e of m.evidence) bySource.set(e.source, [...(bySource.get(e.source) ?? []), e])
  return [...bySource.entries()].map(([source, ev]) => {
    const standing = SOURCE_STANDING[source] ?? 'loop'
    return {
      arc: 'trail',
      tag: source.toUpperCase(),
      title:
        standing === 'market'
          ? `${plural(ev.length, 'fill')} the distill cites`
          : standing === 'yours'
            ? `${plural(ev.length, 'trace')} of your own — ${source}`
            : `${plural(ev.length, 'answer')} to the loop’s own ${source === 'threads' ? 'threads' : 'cards'}`,
      at: span(ev),
      sub:
        standing === 'market'
          ? 'The raw facts — market fills, made outside the loop.'
          : standing === 'yours'
            ? 'Your own acts — what you wrote or read, not what the market did.'
            : 'Made inside the loop — the cards and threads it produced, and how you answered them.',
      kids: ev.map((e) => ({ at: e.date, kind: e.source, text: e.text, to: e.route || null })),
      walked: true,
      go: SOURCE_TO[source] ?? null,
    }
  })
}

/** What the memory caused, read from the objectives that record it as their origin. */
export interface TraceDownstream {
  /** The Console proposes from this memory (`isProposable`). */
  proposed: boolean
  /** The objective drafted from it, with its runs and its own settles. */
  born: { id: string; title: string; created: string | null; runs: number; settled: number } | null
}

export function traceChain(input: {
  memory: JournalMemory
  axes: readonly MemoryAxis[]
  sources: readonly { source: string; enabled: boolean }[]
  downstream?: TraceDownstream
}): TraceNode[] {
  const { memory: m, axes, sources } = input
  const down = input.downstream ?? { proposed: false, born: null }
  const born = down.born
  const on = sources.filter((s) => s.enabled).map((s) => s.source)
  const feeds = axes.filter((a) => a.backs.includes(m.id))
  const trail = trailNodes(m)
  return [
    ...(trail.length
      ? trail
      : [
          {
            arc: 'trail' as const,
            tag: 'TRAIL',
            title: 'No evidence recorded',
            at: 'none',
            sub: 'The store holds this memory without the traces it was distilled from.',
            kids: [],
            walked: false,
            go: null,
          },
        ]),
    {
      arc: 'distill',
      tag: 'DISTILL',
      title: 'Nightly distill reads the trail',
      at: m.first_seen && m.last_seen && m.first_seen !== m.last_seen ? `${m.first_seen} → ${m.last_seen}` : (m.last_seen ?? m.first_seen ?? 'nightly'),
      sub: `Sources on: ${on.length ? on.join(' · ') : 'none'} (Spec §20). ${m.first_seen ? `First distilled ${m.first_seen}` : 'First distill unrecorded'}${m.last_seen && m.last_seen !== m.first_seen ? `, last confirmed ${m.last_seen}` : ''}.`,
      kids: [],
      walked: true,
      go: null,
    },
    {
      arc: 'memory',
      tag: m.id,
      title: m.text,
      at: `strength ${m.strength.toFixed(2)} · n=${m.evidence.length}`,
      sub: [
        [m.kind === 'tension' ? 'said vs did' : m.kind, m.axis ? `${m.axis} axis` : null, m.change].filter(Boolean).join(' · ') + '.',
        feeds.length
          ? `Feeds the portrait’s ${feeds.map((a) => `${a.label} (“${a.value}”)`).join(' and ')}.`
          : 'Backs no portrait axis.',
        'Forget lives on the You page — a topic tombstone, so the conclusion cannot re-grow from the same evidence (Spec §20.2).',
      ].join(' '),
      kids: [],
      walked: true,
      go: { to: `/research/agent-personas/you?m=${encodeURIComponent(m.id)}`, label: `You · memory ${m.id} →` },
    },
    down.proposed || born
      ? {
          arc: 'propose',
          tag: 'PROPOSAL',
          title: born ? 'Proposed on the Pilot Console — and drafted' : 'Proposed on the Pilot Console',
          at: born ? 'drafted' : 'open',
          sub: 'The outer loop’s last arc (§22.4): the distill proposes, you decide. A tension or a weak spot is proposed as the next objective; Not now three times and it goes quiet (§20.6).',
          kids: [],
          walked: true,
          go: { to: '/research/loop/harness', label: 'Pilot Console · Proposed →' },
        }
      : {
          arc: 'propose',
          tag: 'PROPOSAL',
          title: 'Proposal citing this memory',
          at: 'not yet',
          sub: 'Not proposed: the Console proposes from tensions and weak spots only, and from memories strong enough to have been seen more than once.',
          kids: [],
          walked: false,
          go: null,
        },
    born
      ? {
          arc: 'will',
          tag: 'OBJECTIVE',
          title: born.title,
          at: born.created ? born.created.slice(0, 10) : 'drafted',
          sub: `Drafted from ${m.id} · dial L0 · no record yet, so every batch waits for you. Born from memory, it has no Book belief yet — the first settle opens one (§22.2).`,
          kids: [],
          walked: true,
          go: { to: `/research/loop/objectives/${encodeURIComponent(born.id)}`, label: 'Objective →' },
        }
      : {
          arc: 'will',
          tag: 'OBJECTIVE',
          title: 'Draft objective — thesis, scope, dial, leash',
          at: 'not yet',
          sub: down.proposed
            ? 'Draft it from the proposal on the Pilot Console and this node lights — the objective records this memory as its origin.'
            : 'No objective records this memory as its origin.',
          kids: [],
          walked: false,
          go: null,
        },
    born && born.runs > 0
      ? {
          arc: 'run',
          tag: 'RUNS',
          title: 'Six stations — scan, screen, judge, approve',
          at: `${born.runs} run${born.runs === 1 ? '' : 's'}`,
          sub: 'The batch waits in the Decision Inbox — nothing is approved without you (D10).',
          kids: [],
          walked: true,
          go: { to: '/research/loop/decisions', label: 'Decision Inbox →' },
        }
      : {
          arc: 'run',
          tag: 'RUNS',
          title: 'Six stations — scan, screen, judge, approve',
          at: 'not yet',
          sub: born ? 'Drafted but never run — a draft runs when you hand-run it.' : 'Runs belong to objectives; with no objective drafted from this memory there are none to show.',
          kids: [],
          walked: false,
          go: null,
        },
    born && born.settled > 0
      ? {
          arc: 'settle',
          tag: 'VERDICT',
          title: 'Settles feed back — strength and track record return to The Book',
          at: `${born.settled} settled`,
          sub: 'The verdict also becomes new trail — the chain you are reading grows a second lap.',
          kids: [],
          walked: true,
          go: { to: '/research/journal', label: 'Journal →' },
        }
      : {
          arc: 'settle',
          tag: 'VERDICT',
          title: 'Settles feed back — strength and track record return to The Book',
          at: 'not yet',
          sub: 'The verdict would also become new trail — the chain you are reading grows a second lap.',
          kids: [],
          walked: false,
          go: null,
        },
  ]
}
