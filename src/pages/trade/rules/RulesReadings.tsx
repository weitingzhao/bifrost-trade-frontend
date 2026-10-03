/**
 * Three readings where the yellow banners were (design Rev .101): what the
 * daemon runs, the opportunities nothing runs, the gates nothing carries.
 *
 * Each is a button because each has a next step — open the allocation, show
 * only the orphans, open the gate. A banner said the same facts and left the
 * reader to find the place to act on them.
 */
import type { ChainData } from '@/hooks/useRulesChain'
import type { GateSetItem } from '@/types/strategy'
import { cn } from '@/lib/utils'
import { plural } from './rulesChain'

type Lamp = 'ok' | 'degraded' | 'none'

const LAMP: Record<Lamp, string> = {
  ok: 'bg-lamp-green',
  degraded: 'bg-lamp-yellow',
  none: 'bg-[color-mix(in_srgb,var(--sk-ink)_30%,transparent)]',
}

function Reading({
  lamp,
  lead,
  rest,
  leadClass,
  armed,
  title,
  onClick,
}: {
  lamp: Lamp
  lead: string
  rest: string
  leadClass?: string
  armed?: boolean
  title: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={title}
      className={cn(
        // Rev .142: the card tokens, not a hand-written radius and fill; the warn edge is a reading and stays.
        'flex min-w-0 flex-[1_1_17.5rem] items-center gap-2 rounded-[var(--mat-card-radius)] border px-3 py-1.5 text-left text-dense-label',
        'bg-[var(--mat-card-fill)] enabled:hover:bg-[var(--mat-card-fill-hover)]',
        armed ? 'border-[color-mix(in_srgb,var(--sk-warn)_55%,transparent)]' : 'border-transparent',
      )}
    >
      <span aria-hidden className={cn('size-2 flex-none rounded-full', LAMP[lamp])} />
      <span className="min-w-0 leading-snug text-pretty">
        <span className={cn('font-semibold', leadClass ?? 'text-foreground')}>{lead}</span>{' '}
        <span className="text-[var(--sk-mute2)]">{rest}</span>
      </span>
    </button>
  )
}

export function RulesReadings({
  data,
  loose,
  daemonAllocationId,
  orphansOnly,
  onDaemon,
  onToggleOrphans,
  onGate,
}: {
  /**
   * What the Show filter leaves visible — the counts read the same scope the
   * columns draw (a reading about 25 opportunities above a column of 7 is the
   * reader's problem, not a subtlety).
   */
  data: ChainData
  /** Gates no allocation carries, over the whole rulebook (nothing else draws them). */
  loose: GateSetItem[]
  daemonAllocationId: number | null
  orphansOnly: boolean
  onDaemon: (allocationId: number) => void
  onToggleOrphans: () => void
  onGate: (gate: GateSetItem) => void
}) {
  const allocated = new Set(data.allocations.flatMap((a) => a.strategy_opportunity_ids ?? []))
  const orphans = data.opportunities.filter((o) => !allocated.has(o.strategy_opportunity_id))
  const openAll = data.trades.filter((i) => !i.closed)
  const outside = openAll.filter((i) => !allocated.has(i.opportunityId))

  const dA = data.allocations.find((a) => a.strategy_allocation_id === daemonAllocationId)
  const dGate = dA ? data.gates.find((g) => g.gate_safety_strategy_id === dA.gate_safety_strategy_id) : undefined
  const dOpps = new Set(dA?.strategy_opportunity_ids ?? [])
  const dOpen = openAll.filter((i) => dOpps.has(i.opportunityId)).length

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Readings">
      {dA ? (
        <Reading
          lamp="ok"
          lead={`Daemon runs ${dA.name}`}
          rest={[
            dGate ? `${dGate.name} v${dGate.version}` : 'no gate',
            plural(dOpps.size, 'opportunity', 'opportunities'),
            dA.max_positions != null ? `${dOpen} of ${dA.max_positions} positions` : `${dOpen} open`,
          ].join(' · ')}
          title="Open the allocation the daemon's config points at"
          onClick={() => onDaemon(dA.strategy_allocation_id)}
        />
      ) : (
        <Reading
          lamp="degraded"
          lead="The daemon's config points at no allocation"
          rest="· Set active on an allocation writes one there"
          leadClass="text-warning"
          title="Nothing is loaded on the daemon's next start"
        />
      )}
      {orphans.length > 0 ? (
        <Reading
          lamp="degraded"
          lead={`${orphans.length} of ${data.opportunities.length} opportunities in no allocation`}
          rest={
            orphansOnly
              ? '· showing only these — click to show all'
              : `· ${outside.length} of ${openAll.length} open trades run under no gate`
          }
          leadClass="text-warning"
          armed={orphansOnly}
          title={orphansOnly ? 'Show every opportunity again' : 'Show only these in the chain'}
          onClick={onToggleOrphans}
        />
      ) : (
        <Reading lamp="ok" lead="Every opportunity is in an allocation" rest="· none runs outside rules" title="Nothing to act on" />
      )}
      {loose.length > 0 ? (
        <Reading
          lamp="none"
          lead={`${plural(loose.length, 'gate')} carried by no allocation`}
          rest={`${loose.map((g) => `${g.name} v${g.version}`).join(', ')} — bounds nothing`}
          leadClass="text-[var(--sk-soft)]"
          title={`Open ${loose[0].name} in the gate form — edit, copy, or retire it`}
          onClick={() => onGate(loose[0])}
        />
      ) : null}
    </div>
  )
}
