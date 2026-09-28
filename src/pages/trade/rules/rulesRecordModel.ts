/**
 * What the record shows for each kind of focus (design Rev .101).
 *
 * Every figure is derived from the chain the page already holds — the rulebook
 * rows and each instance's own fills (`readInstances`) — so the counts on the
 * record, the lineage bar and the scope board are one computation read three
 * ways. The actions are the page's (they open its sheets); this only places them.
 */
import type { ChainData } from '@/hooks/useRulesChain'
import type { DenseTagVariant } from '@/components/data-display'
import type { EntryCondition } from '@/types/strategy'
import { fmtUsdRound } from '@/lib/format'
import { pnlColorClass } from '@/utils/dailyChange'
import { plural, type ChainSelection } from './rulesChain'
import {
  instanceSym,
  oppsForSym,
  symbolBoard,
  tally,
  type BoardSort,
  type Focus,
  type Tally,
} from './rulesFocus'

export interface RecordAction {
  label: string
  onClick?: () => void
  to?: string
  disabled?: boolean
  title?: string
}

export interface RecordStat {
  k: string
  v: string
  note: string
  ink?: string
  noteClass?: string
}

export interface BoardTileView {
  sym: string
  flag: string
  flagClass: string
  pnl: string
  pnlClass: string
  meta: string
  win: string
  bar: string
  barClass: string
  on: boolean
  dim: boolean
  title: string
  go: () => void
}

export interface RuleRowView {
  id: number
  name: string
  structure: string
  alloc: string
  allocWarn: boolean
  n: string
  open: string
  realised: string
  realisedClass: string
  selected: boolean
  title: string
  go: () => void
}

export interface RecordModel {
  kind: string
  title: string
  titleClass: string
  tag?: { label: string; variant: DenseTagVariant }
  sub: string
  actions: RecordAction[]
  step?: {
    pos: string
    from: string
    prev?: { label: string; go: () => void }
    next?: { label: string; go: () => void }
  }
  stats: RecordStat[]
  conds?: { text: string; note: string; recorded: boolean }
  board?: { count: string; hint: string; tiles: BoardTileView[] }
  rules?: { title: string; note: string; instHead: string; rows: RuleRowView[] }
  /** Whether the instance list follows (every kind but an instance). */
  hasTable: boolean
  /** Scope of the instance list — ids, before the table's own filters. */
  scopedIds: number[]
  /** More than one opportunity in scope: the list shows the Opportunity column. */
  multiOpp: boolean
}

export const signedUsd = (n: number): string => (n > 0 ? `+${fmtUsdRound(n)}` : fmtUsdRound(n))

const MUTED = 'text-muted-foreground'
const WARN = 'text-warning'

/** How an entry condition reads on one line — the store's own words. */
export function conditionText(c: EntryCondition): string {
  const v = c.value_text ?? (c.value_numeric != null ? String(c.value_numeric) : '')
  return v ? `${c.condition_type.replace(/_/g, ' ')} ${v}` : c.condition_type.replace(/_/g, ' ')
}

export interface RecordInput {
  focus: Focus
  data: ChainData
  daemonAllocationId: number | null
  /** The picked opportunity's detail, when fetched (entry conditions live only there). */
  conditions?: EntryCondition[] | null
  boardSort: BoardSort
  actions: RecordAction[]
  siblings?: { ids: number[]; from: string } | null
  on: {
    pick: (sel: ChainSelection) => void
    setSym: (sym: string, keepPick: boolean) => void
    step: (dir: -1 | 1) => void
  }
}

export function buildRecord(x: RecordInput): RecordModel | null {
  const { focus, data: d, on } = x
  const pick = focus.pick
  const sym = focus.sym
  const symNote = sym ? ` on ${sym}` : ''
  const allocsFor = (oid: number) => d.allocations.filter((a) => (a.strategy_opportunity_ids ?? []).includes(oid))
  const gateOf = (gid: number | null | undefined) => d.gates.find((g) => g.gate_safety_strategy_id === gid)
  const oppById = (oid: number) => d.opportunities.find((o) => o.strategy_opportunity_id === oid)
  const bySym = <T extends { id: number }>(list: readonly T[], read: (t: T) => string | null): T[] =>
    sym ? list.filter((t) => read(t) === sym) : [...list]

  const pnlStats = (list: readonly (typeof d.instances)[number][]): RecordStat[] => {
    const t: Tally = tally(list)
    return [
      { k: `Instances${symNote}`, v: String(t.n), note: `${t.open} open · ${t.closed} closed · whatever the filter shows` },
      {
        k: `Realised${symNote}`,
        v: t.closed ? signedUsd(t.realised) : '—',
        note: t.closed ? 'closed instances only, fills-based' : 'no closed instance yet',
        ink: t.closed ? pnlColorClass(t.realised) : MUTED,
      },
      { k: 'Won', v: t.closed ? `${t.won} / ${t.closed}` : '—', note: t.closed ? 'closed with a positive net P&L' : '' },
    ]
  }

  const ruleRows = (oppIds: number[]): RuleRowView[] =>
    oppIds
      .map(oppById)
      .filter((o): o is NonNullable<typeof o> => o != null)
      .map((o) => {
        const list = d.instances.filter(
          (i) => i.opportunityId === o.strategy_opportunity_id && (!sym || instanceSym(i) === sym),
        )
        const t = tally(list)
        const al = allocsFor(o.strategy_opportunity_id)[0]
        const g = al ? gateOf(al.gate_safety_strategy_id) : undefined
        return {
          id: o.strategy_opportunity_id,
          name: o.name,
          structure: o.structure_name ?? '—',
          alloc: al ? `${al.name} · ${g ? `${g.name} v${g.version}` : 'no gate'}` : 'no allocation — runs outside rules',
          allocWarn: !al,
          n: String(t.n),
          open: String(t.open),
          realised: t.closed ? signedUsd(t.realised) : '—',
          realisedClass: t.closed ? pnlColorClass(t.realised) : MUTED,
          selected: pick?.kind === 'opportunity' && pick.id === o.strategy_opportunity_id,
          title: sym ? `Open ${o.name} with ${sym} kept` : `Open ${o.name}`,
          go: () => on.pick({ kind: 'opportunity', id: o.strategy_opportunity_id }),
        }
      })

  if (pick?.kind === 'opportunity' && pick.id != null) {
    const o = oppById(pick.id)
    if (!o) return null
    const al = allocsFor(o.strategy_opportunity_id)[0]
    const g = al ? gateOf(al.gate_safety_strategy_id) : undefined
    const all = d.instances.filter((i) => i.opportunityId === o.strategy_opportunity_id)
    const tiles = symbolBoard(o.symbols ?? [], all, x.boardSort)
    const maxAbs = Math.max(1, ...tiles.map((t) => Math.abs(t.tally.realised)))
    const ran = tiles.filter((t) => t.tally.n).length
    const conds = x.conditions
    return {
      kind: 'opportunity',
      title: o.name,
      titleClass: 'text-foreground',
      tag: al ? { label: 'available', variant: 'success' } : { label: 'no allocation', variant: 'warning' },
      sub: o.structure_name ?? '—',
      actions: x.actions,
      stats: [
        al
          ? {
              k: 'Run by',
              v: al.name,
              note:
                al.strategy_allocation_id === x.daemonAllocationId
                  ? 'the daemon runs this allocation'
                  : 'on the books — not what the daemon runs',
            }
          : { k: 'Run by', v: 'nothing', note: 'in no allocation — the daemon never opens it', ink: WARN, noteClass: WARN },
        al
          ? {
              k: 'Gate',
              v: g ? `${g.name} v${g.version}` : 'none',
              note: `inherited from ${al.name} · hits land on Risk › Limits`,
            }
          : { k: 'Gate', v: 'none', note: 'instances under it ran outside rules', ink: WARN, noteClass: WARN },
        ...pnlStats(bySym(all, instanceSym)),
      ],
      conds:
        conds === undefined
          ? undefined
          : conds && conds.length
            ? {
                text: conds.map(conditionText).join(' · '),
                note: o.gate_safety_name ? `default gate ${o.gate_safety_name} applies only where the allocation carries none` : '',
                recorded: true,
              }
            : { text: 'none recorded', note: 'Edit adds them — the daemon reads only what is written here', recorded: false },
      board: {
        count: `${plural((o.symbols ?? []).length, 'symbol')} · ${ran} have run`,
        hint: sym ? `Narrowed to ${sym} — click it again to release` : 'Click a symbol to narrow everything below to it',
        tiles: tiles.map((t) => {
          const isOn = sym === t.sym
          return {
            sym: t.sym,
            flag: t.offScope ? 'off scope' : t.tally.open ? `● ${t.tally.open} open` : t.tally.n ? '' : 'never ran',
            flagClass: t.offScope ? WARN : t.tally.open ? 'text-profit' : MUTED,
            pnl: t.tally.closed ? signedUsd(t.tally.realised) : '—',
            pnlClass: t.tally.closed ? pnlColorClass(t.tally.realised) : MUTED,
            meta: t.tally.n ? plural(t.tally.n, 'instance') : 'no instance',
            win: t.tally.closed ? `won ${t.tally.won}/${t.tally.closed}` : '',
            bar: t.tally.closed ? `${Math.round((Math.abs(t.tally.realised) / maxAbs) * 100)}%` : '0%',
            barClass: t.tally.realised >= 0 ? 'bg-[var(--color-profit)]' : 'bg-[var(--color-loss)]',
            on: isOn,
            dim: (sym != null && !isOn) || t.tally.n === 0,
            title: isOn ? `Release ${t.sym}` : `Narrow to ${t.sym}`,
            go: () => on.setSym(t.sym, true),
          }
        }),
      },
      hasTable: true,
      scopedIds: bySym(all, instanceSym).map((i) => i.id),
      multiOpp: false,
    }
  }

  if (pick?.kind === 'structure' && pick.id != null) {
    const s = d.structures.find((x2) => x2.strategy_structure_id === pick.id)
    if (!s) return null
    const opps = d.opportunities.filter((o) => o.strategy_structure_id === s.strategy_structure_id)
    const oppIds = new Set(opps.map((o) => o.strategy_opportunity_id))
    const scoped = d.instances.filter((i) => oppIds.has(i.opportunityId))
    const dims = [s.dim_direction, s.dim_coverage, s.dim_risk].filter(Boolean).join(' · ')
    return {
      kind: 'structure',
      title: s.name,
      titleClass: 'text-foreground',
      tag: s.is_active ? { label: 'available', variant: 'success' } : { label: 'off', variant: 'neutral' },
      sub: plural(opps.length, 'opportunity uses it', 'opportunities use it'),
      actions: x.actions,
      stats: [
        { k: 'Legs', v: String(s.legs?.length ?? 0), note: s.dim_structure ?? 'no dimension' },
        { k: 'Template', v: s.template_display_name ?? '—', note: 'the Option Category catalog — a field, not a page' },
        { k: 'Dimensions', v: s.dim_direction ?? '—', note: dims || 'no dimensions recorded' },
        { k: 'Version', v: `v${s.version}`, note: s.is_active ? 'available to new opportunities' : 'off — not offered' },
        ...pnlStats(bySym(scoped, instanceSym)),
      ],
      rules: opps.length
        ? {
            title: 'Opportunities using it',
            note: 'click one to open it',
            instHead: `Instances${symNote}`,
            rows: ruleRows([...oppIds]),
          }
        : undefined,
      hasTable: true,
      scopedIds: bySym(scoped, instanceSym).map((i) => i.id),
      multiOpp: opps.length > 1,
    }
  }

  if (pick?.kind === 'allocation' && pick.id != null) {
    const a = d.allocations.find((x2) => x2.strategy_allocation_id === pick.id)
    if (!a) return null
    const g = gateOf(a.gate_safety_strategy_id)
    const oppIds = a.strategy_opportunity_ids ?? []
    const scoped = d.instances.filter((i) => oppIds.includes(i.opportunityId))
    const openN = scoped.filter((i) => !i.closed).length
    const mine = a.strategy_allocation_id === x.daemonAllocationId
    return {
      kind: 'allocation',
      title: a.name,
      titleClass: 'text-foreground',
      tag: a.is_active ? { label: 'on the books', variant: 'success' } : { label: 'off the books', variant: 'neutral' },
      sub: g ? `gate ${g.name} v${g.version}` : 'no gate',
      actions: x.actions,
      stats: [
        {
          k: 'On the books',
          v: a.is_active ? 'active' : 'off',
          note: 'it may be picked — the rulebook flag',
          ink: a.is_active ? 'text-profit' : MUTED,
        },
        {
          k: 'The daemon runs',
          v: mine ? 'this one' : 'another',
          note: mine ? 'its config points here and loads it on next start' : 'Set active writes this one there',
          ink: mine ? 'text-profit' : WARN,
        },
        { k: 'Gate', v: g ? `${g.name} v${g.version}` : 'none', note: 'a limit set scoped to this allocation' },
        a.max_positions != null
          ? {
              k: 'Positions',
              v: `${openN} / ${a.max_positions}`,
              note: 'open instances against max positions',
              ink: openN >= a.max_positions ? WARN : undefined,
            }
          : { k: 'Positions', v: String(openN), note: 'no maximum set' },
      ],
      rules: {
        title: 'Opportunities it runs',
        note: 'each keeps its own conditions',
        instHead: `Instances${symNote}`,
        rows: ruleRows(oppIds),
      },
      hasTable: true,
      scopedIds: bySym(scoped, instanceSym).map((i) => i.id),
      multiOpp: true,
    }
  }

  if (pick?.kind === 'instance' && pick.id != null) {
    const i = d.instances.find((r) => r.id === pick.id)
    if (!i) return null
    const o = oppById(i.opportunityId)
    const al = allocsFor(i.opportunityId)[0]
    const g = al ? gateOf(al.gate_safety_strategy_id) : undefined
    const sib = x.siblings && x.siblings.ids.includes(i.id) ? x.siblings : null
    const j = sib ? sib.ids.indexOf(i.id) : -1
    const stepTo = (k: -1 | 1) => {
      const id = sib?.ids[j + k]
      return id != null ? { label: `#${id}`, go: () => on.step(k) } : undefined
    }
    return {
      kind: 'instance',
      title: `#${i.id} · ${i.symbolish}`,
      titleClass: 'font-mono text-[var(--sk-instance,#c084fc)]',
      tag: i.closed ? { label: 'closed', variant: 'neutral' } : { label: 'open', variant: 'success' },
      sub: o?.name ?? i.opportunityName,
      actions: x.actions,
      step: sib ? { pos: `${j + 1} of ${sib.ids.length}`, from: sib.from, prev: stepTo(-1), next: stepTo(1) } : undefined,
      stats: [
        i.closed
          ? {
              k: 'Realised',
              v: i.realised != null ? signedUsd(i.realised) : '—',
              note: 'flat by its own fills, fees included',
              ink: pnlColorClass(i.realised ?? 0),
            }
          : { k: 'Net P&L', v: '—', note: i.fills ? 'open — its legs are marked on Positions' : 'no fill has claimed it yet', ink: MUTED },
        { k: 'Opened', v: i.openedOn ?? '—', note: i.closed ? 'closed by its fills' : 'still open by its fills' },
        { k: 'Fills', v: String(i.fills), note: i.fills ? 'linked on Orders & Fills' : 'empty — safe to delete' },
        { k: 'Structure', v: o?.structure_name ?? i.structureName, note: 'as the opportunity specifies' },
        al
          ? { k: 'Gate', v: g ? `${g.name} v${g.version}` : 'none', note: `inherited from ${al.name}` }
          : { k: 'Gate', v: 'none', note: 'ran outside rules — no allocation carries its opportunity', ink: WARN, noteClass: WARN },
      ],
      hasTable: false,
      scopedIds: [],
      multiOpp: false,
    }
  }

  if (pick?.kind === 'instance' && pick.id == null) {
    // The whole column — every instance in the book (what Strategy › Instances
    // was, and where its address still lands).
    const all = bySym(d.instances, instanceSym)
    return {
      kind: 'instances',
      title: 'Every instance',
      titleClass: 'text-foreground',
      sub: sym ? `narrowed to ${sym}` : 'the whole book, whatever the chain is showing',
      actions: x.actions,
      stats: pnlStats(all),
      hasTable: true,
      scopedIds: all.map((i) => i.id),
      multiOpp: true,
    }
  }

  if (sym) {
    const oppIds = oppsForSym(sym, d)
    const scoped = d.instances.filter((i) => instanceSym(i) === sym)
    const allocated = new Set(d.allocations.flatMap((a) => a.strategy_opportunity_ids ?? []))
    const inA = oppIds.filter((oid) => allocated.has(oid)).length
    return {
      kind: 'symbol',
      title: sym,
      titleClass: 'font-mono text-[var(--sk-ticker)]',
      sub: 'cuts across the chain — every rule that can act on it, and everything that ran on it',
      actions: x.actions,
      stats: [
        inA
          ? {
              k: 'Covered by',
              v: plural(oppIds.length, 'opportunity', 'opportunities'),
              note: `${inA} in an allocation — the daemon may act on ${sym}`,
            }
          : {
              k: 'Covered by',
              v: plural(oppIds.length, 'opportunity', 'opportunities'),
              note: `none in an allocation — the daemon never acts on ${sym}`,
              noteClass: WARN,
            },
        ...pnlStats(scoped).map((s) => ({ ...s, k: s.k.replace(` on ${sym}`, '') })),
      ],
      rules: oppIds.length
        ? {
            title: `Rules that can act on ${sym}`,
            note: `counts are ${sym} only · click one to open it with ${sym} kept`,
            instHead: 'Instances',
            rows: ruleRows(oppIds),
          }
        : undefined,
      hasTable: true,
      scopedIds: scoped.map((i) => i.id),
      multiOpp: true,
    }
  }

  return null
}
