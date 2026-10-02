/**
 * The Trade page's rail (design Rev .103): the lineage it ran under with its
 * sibling trades, and the Journal notes that link it. A note written here
 * links both the trade and its symbol, and lands in the Journal's Day view
 * with the rest.
 *
 * Rev .112 (§5.1.2): the lineage opens with where the trade came from — the
 * Idea (source · ref · lens · run) and the Plan — which is the old Outcome
 * page's single-trade trace; Fills and Close are the page's own blocks.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { positionsUi } from '@/components/positions/positionsUi'
import { useAllocations, useGateSafety, useOpportunities, useStructures, useStrategyInstances } from '@/hooks/useStrategies'
import { createNote, fetchNotes, type NoteRef } from '@/api/research/journal'
import { tradePath } from '@/layout/equipSurface'
import { cn } from '@/lib/utils'
import { d3 } from '@/utils/tradeRecord/tradeRecordModel'
import type { RanUnder } from '@/utils/tradeRecord/ranUnder'
import type { StrategyInstance } from '@/types/positions'
import { TradeBlock } from './TradeBlock'
import { useTradeOrigins } from '@/hooks/useTradeOrigins'
import { ORIGIN_UNRECORDED, planPath, planTermsText, planToken } from '@/utils/tradeOrigin'


export function TradeLineage({
  instance,
  sym,
  ranUnder,
  from,
  list,
}: {
  instance: StrategyInstance
  sym: string | null
  ranUnder: RanUnder | null
  from: string
  list?: readonly number[]
}) {
  const navigate = useNavigate()
  const opps = useOpportunities()
  const structures = useStructures()
  const allocations = useAllocations()
  const gates = useGateSafety()
  const siblingsQ = useStrategyInstances({ opportunityId: instance.strategy_opportunity_id })
  const id = instance.strategy_instance_id
  const opp = opps.data?.items.find((o) => o.strategy_opportunity_id === instance.strategy_opportunity_id)
  const st = structures.data?.items.find((x) => x.strategy_structure_id === (opp?.strategy_structure_id ?? instance.strategy_structure_id))
  const al = allocations.data?.items.find((a) => (a.strategy_opportunity_ids ?? []).includes(instance.strategy_opportunity_id))
  const gate = al ? gates.data?.items.find((g) => g.gate_safety_strategy_id === al.gate_safety_strategy_id) : undefined
  const sibs = [...(siblingsQ.data?.items ?? [])].sort((a, b) => (b.opened_at_epoch ?? 0) - (a.opened_at_epoch ?? 0))
  const sibIds = sibs.map((x) => x.strategy_instance_id)
  const openedIso = instance.opened_at ? instance.opened_at.slice(0, 10) : null
  const origin = useTradeOrigins().byTrade.get(id)

  const chain: {
    kind: string
    name: string
    meta: string
    mono?: boolean
    warn?: boolean
    ink?: string
    muted?: boolean
    title?: string
    to?: string
  }[] = [
    {
      kind: 'Idea',
      name: origin ? `${origin.source}${origin.ref ? ` · ${origin.ref}` : ''}` : 'not recorded',
      muted: !origin,
      meta: origin
        ? origin.sourceKind === 'roll'
          ? 'continues the trade it rolled from · no lens · no backtest run behind it'
          : 'no lens recorded · no backtest run behind it'
        : 'no plan names this trade, so nothing records where the idea came from',
      title: `${ORIGIN_UNRECORDED.lens} ${ORIGIN_UNRECORDED.run}`,
    },
    {
      kind: 'Plan',
      name: origin ? planToken(origin.planId) : 'no plan written',
      mono: Boolean(origin),
      // Rev .113 §5.1.4a: a TP token is mono and muted — never an identity ink — and lands on Plans.
      muted: true,
      to: origin ? planPath(origin.planId) : undefined,
      title: origin ? `Open ${planToken(origin.planId)} on Trading › Plans` : undefined,
      meta: origin ? planTermsText(origin) : 'nothing to measure the exit against',
    },
    {
      kind: 'Structure',
      name: st?.name ?? instance.strategy_structure_name ?? '—',
      meta: st
        ? [st.template_display_name, `${st.legs.length} ${st.legs.length === 1 ? 'leg' : 'legs'}`, st.dim_direction, st.dim_coverage, `v${st.version}`]
            .filter(Boolean)
            .join(' · ')
        : 'not in the active structures',
    },
    {
      kind: 'Opportunity',
      name: opp?.name ?? instance.strategy_opportunity_name ?? '—',
      meta: opp ? (opp.symbols?.length ? opp.symbols.join(' · ') : 'no symbols') + (opp.is_active ? '' : ' · inactive') : '—',
    },
    {
      kind: 'Allocation',
      name: al?.name ?? 'none',
      warn: !al,
      meta: al
        ? [
            gate ? `gate ${gate.name} v${gate.version}` : 'no gate',
            al.max_positions != null ? `max ${al.max_positions} positions` : null,
            al.max_bp_pct != null ? `${Math.round(al.max_bp_pct * (al.max_bp_pct <= 1 ? 100 : 1))}% BP` : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : (ranUnder?.alloc ?? 'ran outside rules — no allocation, no gate'),
    },
    {
      kind: 'Trade',
      name: `#${id}${sym ? ` · ${sym}` : ''}`,
      mono: true,
      ink: 'var(--sk-trade)',
      meta: `opened ${d3(openedIso)}`,
    },
  ]

  return (
    <TradeBlock
      cap="Lineage"
      title="Came from, ran under"
      action={
        <button type="button" className={positionsUi.link} onClick={() => navigate(`/trade/rules?pick=instance:${id}`)}>
          Trading › Rules →
        </button>
      }
    >
      <div className="flex flex-col">
        {chain.map((c) => (
          <div
            key={c.kind}
            className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-2.5 gap-y-0.5 border-b border-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)] px-3 py-1.75"
          >
            <span className="pt-px text-dense-micro font-semibold text-muted-foreground">{c.kind}</span>
            <span
              className={cn(
                'min-w-0 text-dense-label font-semibold',
                c.mono && 'font-mono',
                c.warn && 'text-warning',
                c.muted && 'text-muted-foreground',
              )}
              style={c.ink ? { color: c.ink } : undefined}
              title={c.title}
            >
              {c.to ? (
                <button
                  type="button"
                  onClick={() => navigate(c.to as string)}
                  className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[var(--sk-mute2)] hover:underline"
                >
                  {c.name}
                </button>
              ) : (
                c.name
              )}
            </span>
            <span />
            <span className={cn('min-w-0 text-dense-micro text-pretty', c.warn ? 'text-warning' : 'text-[var(--sk-mute2)]')}>{c.meta}</span>
          </div>
        ))}
        <div className="flex flex-col gap-1.5 px-3 pt-2 pb-2.5">
          <span className="text-dense-micro text-muted-foreground">
            {sibs.length > 1 ? `${sibs.length} trades under this opportunity — newest first` : 'The only trade under this opportunity'}
          </span>
          {sibs.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {sibs.slice(0, 24).map((x) => (
                <button
                  key={x.strategy_instance_id}
                  type="button"
                  onClick={() =>
                    navigate(
                      tradePath(
                        x.strategy_instance_id,
                        list && list.includes(x.strategy_instance_id) ? list : sibIds,
                        list && list.includes(x.strategy_instance_id) ? from : opp?.name ?? 'Siblings',
                      ),
                    )
                  }
                  title={`#${x.strategy_instance_id}${x.label?.trim() ? ` · ${x.label.trim()}` : ''}`}
                  className={cn(
                    'h-5.5 cursor-pointer rounded-md border-0 px-1.5 font-mono text-dense-micro font-bold text-[var(--sk-trade)]',
                    x.strategy_instance_id === id
                      ? 'bg-[color-mix(in_srgb,var(--sk-trade)_18%,transparent)]'
                      : 'bg-transparent hover:bg-[color-mix(in_srgb,var(--sk-trade)_16%,transparent)]',
                  )}
                >
                  #{x.strategy_instance_id}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </TradeBlock>
  )
}

export function TradeJournal({ id, sym }: { id: number; sym: string | null }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const notesQ = useQuery({
    queryKey: ['research', 'journal', 'notes', 'inst', id],
    queryFn: () => fetchNotes({ ref_type: 'inst', ref_id: String(id), limit: 50 }),
    staleTime: 60_000,
  })
  const add = useMutation({
    mutationFn: (body: string) => {
      const refs: NoteRef[] = [{ type: 'inst', id: String(id) }, ...(sym ? [{ type: 'sym' as const, id: sym }] : [])]
      return createNote({ body_md: body, page_route: `/trade/${id}`, page_label: `Trade #${id}`, refs })
    },
    onSuccess: () => {
      setDraft('')
      void qc.invalidateQueries({ queryKey: ['research', 'journal', 'notes'] })
    },
  })
  const notes = notesQ.data?.notes ?? []
  const submit = () => {
    const body = draft.trim()
    if (body && !add.isPending) add.mutate(body)
  }
  return (
    <TradeBlock
      cap="Journal"
      title={notes.length ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'} on #${id}` : `Notes on #${id}`}
      action={
        <button type="button" className={positionsUi.link} onClick={() => navigate('/research/journal')}>
          Book › Journal →
        </button>
      }
    >
      <div className="flex flex-col gap-2 px-3 pt-2 pb-2.5">
        <div className="flex gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            placeholder={`A note on #${id}${sym ? ` · ${sym}` : ''}`}
            aria-label="Note on this trade"
            className="h-7 min-w-0 flex-1 mat-field px-2 text-dense-label"
          />
          <button type="button" className={positionsUi.btn} disabled={!draft.trim() || add.isPending} onClick={submit}>
            {add.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
        {add.isError ? <span className="text-dense-micro text-destructive">The note was not saved: {(add.error as Error).message}</span> : null}
        {notesQ.isError ? (
          <span className="text-dense-micro text-muted-foreground">
            The Journal did not answer ({(notesQ.error as Error).message}) — notes live in Book › Journal.
          </span>
        ) : notes.length === 0 && !notesQ.isLoading ? (
          <span className="text-dense-label text-muted-foreground text-pretty">
            No note links this trade yet. A note written here links #{id}
            {sym ? ` and ${sym}` : ''}, and lands in the Journal&rsquo;s Day view with the rest.
          </span>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="grid grid-cols-[78px_minmax(0,1fr)] gap-x-2 gap-y-px border-t border-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)] pt-1.5">
              <span className="font-mono text-dense-micro whitespace-nowrap text-muted-foreground">{n.created_at ? d3(n.created_at.slice(0, 10)) : '—'}</span>
              <span className="text-dense-label text-pretty">{n.body_md}</span>
              <span />
              <span className="text-dense-micro text-muted-foreground">{n.page_label || n.page_route}</span>
            </div>
          ))
        )}
      </div>
    </TradeBlock>
  )
}
