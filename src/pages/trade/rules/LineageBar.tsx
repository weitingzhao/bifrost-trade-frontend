/**
 * The folded chain (design Rev .101): once something is picked, the four
 * columns collapse into one sticky bar — the way back, the path walked, and
 * the lineage as four short segments — and the record follows right under it.
 *
 * Every chip is a pick. The path is the page's own history: ← Back (or Esc /
 * ⌥←) walks it one step, a crumb jumps to it, and the state each step left
 * (filters, folds, scroll) comes back with it.
 */
import type { ReactNode } from 'react'
import type { ChainData } from '@/hooks/useRulesChain'
import { cn } from '@/lib/utils'
import { plural, type ChainSelection } from './rulesChain'
import type { Focus, Lit } from './rulesFocus'

export interface Crumb {
  label: string
  /** Undefined for where the reader is standing. */
  go?: () => void
}

function Chip({
  label,
  title,
  selected,
  onClick,
}: {
  label: string
  title: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'max-w-[16rem] truncate rounded-md px-2 py-0.5 text-dense-label',
        selected
          ? 'bg-[color-mix(in_srgb,var(--sk-accent)_14%,transparent)] text-[var(--sk-accent)]'
          : 'bg-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] text-foreground hover:bg-[color-mix(in_srgb,var(--sk-ink)_12%,transparent)]',
      )}
    >
      {label}
    </button>
  )
}

function Segment({ step, title, children }: { step: string; title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-[1_1_14rem] flex-col gap-1 border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] px-3 py-2 @3xl/page:border-l @3xl/page:border-t-0 first:@3xl/page:border-l-0">
      <span className="text-dense-micro text-muted-foreground">
        <span className="font-semibold">{step}</span> · {title}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-1">{children}</div>
    </div>
  )
}

const Note = ({ children, warn }: { children: ReactNode; warn?: boolean }) => (
  <span className={cn('text-dense-meta', warn ? 'text-warning' : 'text-muted-foreground')}>{children}</span>
)

export function LineageBar({
  data,
  focus,
  lit,
  crumbs,
  backTitle,
  onBack,
  onPick,
  onClearSym,
  chainOpen,
  onToggleChain,
}: {
  data: ChainData
  focus: Focus
  lit: Lit
  crumbs: Crumb[]
  backTitle: string
  onBack: () => void
  onPick: (sel: ChainSelection) => void
  onClearSym: () => void
  chainOpen: boolean
  onToggleChain: () => void
}) {
  const isSel = (kind: ChainSelection['kind'], id: number) =>
    focus.pick?.kind === kind && focus.pick.id === id
  const structures = data.structures.filter((s) => lit.structure.has(s.strategy_structure_id))
  const opps = data.opportunities.filter((o) => lit.opportunity.has(o.strategy_opportunity_id))
  const allocs = data.allocations.filter((a) => lit.allocation.has(a.strategy_allocation_id))
  const gatesOf = allocs
    .map((a) => data.gates.find((g) => g.gate_safety_strategy_id === a.gate_safety_strategy_id))
    .filter((g): g is NonNullable<typeof g> => g != null)
  const insts = data.instances.filter((i) => lit.instance.has(i.id))
  const pickedInstance =
    focus.pick?.kind === 'instance' ? data.instances.find((i) => i.id === focus.pick!.id) : undefined
  const OPP_CAP = 3

  return (
    <nav
      aria-label="Lineage"
      className="sticky top-0 z-[4] flex min-w-0 flex-wrap overflow-hidden rounded-xl bg-[color-mix(in_srgb,var(--sk-surface)_90%,transparent)] shadow-[0_8px_24px_-16px_rgb(0_0_0/0.6)] backdrop-blur-[12px]"
    >
      <div className="flex min-w-0 flex-[1_1_100%] items-center gap-2.5 border-b border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] px-3 py-1.5">
        <button
          type="button"
          onClick={onBack}
          title={backTitle}
          className="inline-flex h-6 flex-none items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] px-2.5 text-dense-label text-foreground hover:bg-[color-mix(in_srgb,var(--sk-ink)_13%,transparent)]"
        >
          ← Back
        </button>
        <ol aria-label="Path" className="m-0 flex min-w-0 flex-auto list-none items-center gap-1 overflow-hidden p-0 text-dense-label">
          {crumbs.map((c, i) => (
            <li key={`${c.label}-${i}`} className="inline-flex min-w-0 flex-[0_1_auto] items-center gap-1">
              <button
                type="button"
                onClick={c.go}
                disabled={!c.go}
                title={c.go ? `Back to ${c.label}` : 'You are here'}
                aria-current={c.go ? undefined : 'location'}
                className={cn(
                  'truncate rounded px-1 py-0.5',
                  c.go
                    ? 'text-[var(--sk-mute2)] hover:bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]'
                    : 'cursor-default font-semibold text-foreground',
                )}
              >
                {c.label}
              </button>
              {i < crumbs.length - 1 ? (
                <span aria-hidden className="text-muted-foreground">
                  ›
                </span>
              ) : null}
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onToggleChain}
          className="inline-flex h-6 flex-none items-center rounded-lg px-2 text-dense-label text-[var(--sk-mute2)] hover:bg-[color-mix(in_srgb,var(--sk-ink)_13%,transparent)] hover:text-foreground"
        >
          {chainOpen ? 'Fold chain ▴' : 'Whole chain ▾'}
        </button>
      </div>

      {focus.sym ? (
        <div className="flex flex-none items-center gap-2 border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] px-3 py-2 @3xl/page:border-t-0">
          <span className="text-dense-micro font-semibold whitespace-nowrap text-muted-foreground">symbol</span>
          <span className="font-mono text-dense-body font-bold text-[var(--sk-ticker)]">{focus.sym}</span>
          <button
            type="button"
            onClick={onClearSym}
            title="Drop the symbol"
            aria-label="Drop the symbol"
            className="text-dense-meta text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      ) : null}

      <Segment step="shape" title="Structure">
        {structures.length ? (
          structures.map((s) => (
            <Chip
              key={s.strategy_structure_id}
              label={s.name}
              title="Pick this structure"
              selected={isSel('structure', s.strategy_structure_id)}
              onClick={() => onPick({ kind: 'structure', id: s.strategy_structure_id })}
            />
          ))
        ) : (
          <Note>—</Note>
        )}
      </Segment>
      <Segment step="› when" title="Opportunity">
        {opps.slice(0, OPP_CAP).map((o) => (
          <Chip
            key={o.strategy_opportunity_id}
            label={o.name}
            title={o.name}
            selected={isSel('opportunity', o.strategy_opportunity_id)}
            onClick={() => onPick({ kind: 'opportunity', id: o.strategy_opportunity_id })}
          />
        ))}
        {opps.length > OPP_CAP ? <Note>+{opps.length - OPP_CAP}</Note> : opps.length === 0 ? <Note>—</Note> : null}
      </Segment>
      <Segment step="› run" title="Allocation · gate">
        {allocs.map((a) => (
          <Chip
            key={a.strategy_allocation_id}
            label={a.name}
            title={a.name}
            selected={isSel('allocation', a.strategy_allocation_id)}
            onClick={() => onPick({ kind: 'allocation', id: a.strategy_allocation_id })}
          />
        ))}
        {allocs.length ? (
          <Note>{gatesOf.map((g) => `${g.name} v${g.version}`).join(', ') || 'no gate'}</Note>
        ) : (
          <Note warn>no allocation — runs outside rules</Note>
        )}
      </Segment>
      <Segment step="› running" title="Trades">
        {pickedInstance ? (
          <Chip
            label={`#${pickedInstance.id} · ${pickedInstance.symbolish}`}
            title={pickedInstance.opportunityName}
            selected
            onClick={() => onPick({ kind: 'instance', id: pickedInstance.id })}
          />
        ) : (
          <Note>
            <span className="text-[var(--sk-soft)]">
              {insts.filter((i) => !i.closed).length} open · {plural(insts.filter((i) => i.closed).length, 'closed', 'closed')}
            </span>
          </Note>
        )}
      </Segment>
    </nav>
  )
}
