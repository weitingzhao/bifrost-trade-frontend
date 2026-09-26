import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  CollapsibleChevron,
  DenseDataTable,
  DenseTableHeader,
  DenseTableBody,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTableHead,
  DenseTableCell,
  denseTableNumCell,
} from '@/components/data-display'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { cn } from '@/lib/utils'
import { fmtIsoDateToken, fmtUsd } from '@/lib/format'
import { perfUi } from '@/pages/portfolio/performance/performanceUi'
import { pnlColorClass } from '@/utils/dailyChange'
import type { SameDayRollEvent } from '@/utils/ledger/sameDayOptionRolls'
import type { ByDayRangeData } from '@/types/trading'
import {
  buildOptionsModeBridgeSummary,
  groupChainRowsByRollDay,
  groupSameDayRollsByUndAndChain,
  shortOptContractKey,
  shortOptLegLabel,
  type RollBridgeChain,
} from '@/utils/ledger/optionsModeBridge'

const BRIDGE_HELP =
  'Book R = contract FIFO realized in range. Economic = Book R + Σ same-day roll adj (roll cash − Book close R). Total = Book R + Open inventory as of today. Economic − Total = Σ roll adj − Open. Hierarchy: underlying → bridge chain → roll day (cash statement) → fills. Drag the bottom edge to resize height.'

const BODY_H_DEFAULT = 560
const BODY_H_MIN = 280
const BODY_H_MAX = 900
const BODY_H_STORAGE_KEY = 'perf.optionsPathBridge.bodyHeight'

function readStoredBodyHeight(): number {
  try {
    const raw = localStorage.getItem(BODY_H_STORAGE_KEY)
    const n = raw != null ? Number(raw) : NaN
    if (Number.isFinite(n)) return Math.min(BODY_H_MAX, Math.max(BODY_H_MIN, n))
  } catch {
    /* ignore */
  }
  return BODY_H_DEFAULT
}

/** Prototype `.pf-th`: sentence case, 10px, soft — not the dense table's uppercase head. */
const bridgeTh = 'bg-transparent text-dense-caption font-semibold normal-case tracking-normal text-secondary-foreground'

/** One row in the bridge tree, prototype `.pf-node`: chevron, the item, its figures, a quiet tail on the right. */
function BridgeNode({
  open,
  onToggle,
  indent,
  children,
  tail,
}: {
  open: boolean
  onToggle: () => void
  indent: 0 | 1 | 2
  children: React.ReactNode
  tail?: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className={cn(
        'flex w-full cursor-pointer flex-wrap items-center gap-2 border-0 bg-transparent py-1.25 pr-2.5 text-left text-xs text-foreground hover:bg-[var(--sk-raised2)]',
        indent === 0 ? 'pl-2.5' : indent === 1 ? 'pl-7' : 'pl-11.5',
      )}
    >
      <CollapsibleChevron expanded={open} className={cn('h-3 w-3', open ? 'rotate-0' : '-rotate-90')} />
      {children}
      {tail ? <span className="ml-auto font-mono text-dense-meta text-muted-foreground">{tail}</span> : null}
    </button>
  )
}

function Figure({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <span className="flex items-baseline gap-1.25">
      <span className="whitespace-nowrap text-dense-micro font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <span className={cn('font-mono tabular-nums', tone ?? pnlColorClass(value))}>{fmtUsd(value)}</span>
    </span>
  )
}

function ChainDayBlocks({
  chain,
  expandedDay,
  onToggleDay,
}: {
  chain: RollBridgeChain
  expandedDay: Set<string>
  onToggleDay: (key: string) => void
}) {
  const days = useMemo(() => groupChainRowsByRollDay(chain.rows), [chain.rows])

  return (
    <>
      {days.map((day) => {
        const dayKey = `${chain.id}|${day.dateStr}`
        const dayOpen = expandedDay.has(dayKey)
        const stepHint =
          day.steps.length === 1
            ? `${shortOptLegLabel(day.steps[0]!.closeContractKey)} → ${shortOptLegLabel(day.steps[0]!.openContractKey)}`
            : `${day.steps.length} bridges`
        return (
          <div key={dayKey} className="min-w-0">
            <BridgeNode
              open={dayOpen}
              onToggle={() => onToggleDay(dayKey)}
              indent={2}
              tail={`${day.fills} fill${day.fills === 1 ? '' : 's'} · ${stepHint}`}
            >
              <span className="font-mono font-semibold tabular-nums">{fmtIsoDateToken(day.dateStr)}</span>
              <span className="text-dense-meta text-muted-foreground">Cash statement</span>
              <Figure label="Cash roll" value={day.cashRoll} tone="text-muted-foreground" />
              <Figure label="Book close" value={day.bookClose} />
              <Figure label="Adj" value={day.adj} />
            </BridgeNode>
            {dayOpen ? (
              <div className="space-y-2 pr-3 pb-2.5 pl-11.5">
                {day.steps.map((step) => (
                  <div key={`${step.closeContractKey}|${step.openContractKey}`} className="min-w-0">
                    {day.steps.length > 1 ? (
                      <p className="mb-1 text-dense-meta text-muted-foreground">
                        <span className="font-mono text-entity-option">
                          {shortOptLegLabel(step.closeContractKey)} → {shortOptLegLabel(step.openContractKey)}
                        </span>
                        {' · '}
                        <span className={`tabular-nums ${pnlColorClass(step.cashRoll)}`}>
                          Cash {fmtUsd(step.cashRoll)}
                        </span>
                        {' · '}
                        <span className={`tabular-nums ${pnlColorClass(step.adj)}`}>
                          Adj {fmtUsd(step.adj)}
                        </span>
                      </p>
                    ) : null}
                    {/* §14.6: the prototype's 560 floor raised to 640 — on DEV the widest contract token
                        (142px) and the three money columns (≤105px each) do not fit in 560. */}
                    <DenseDataTable wrapClassName="rounded-sm bg-[var(--sk-raised2)]" tableClassName="min-w-[640px]">
                      <colgroup>
                        <col style={{ width: '7.5%' }} />
                        <col style={{ width: '23.5%' }} />
                        <col style={{ width: '20.5%' }} />
                        <col style={{ width: '16.5%' }} />
                        <col style={{ width: '15.5%' }} />
                        <col style={{ width: '16.5%' }} />
                      </colgroup>
                      <DenseTableHeader>
                        <DenseTableHeadRow>
                          <DenseTableHead className={cn(bridgeTh, 'text-right')}>Qty</DenseTableHead>
                          <DenseTableHead className={bridgeTh}>Close</DenseTableHead>
                          <DenseTableHead className={bridgeTh}>Open to</DenseTableHead>
                          <DenseTableHead className={cn(bridgeTh, 'text-right')}>Book close</DenseTableHead>
                          <DenseTableHead className={cn(bridgeTh, 'text-right')}>Cash roll</DenseTableHead>
                          <DenseTableHead className={cn(bridgeTh, 'text-right')}>Adj</DenseTableHead>
                        </DenseTableHeadRow>
                      </DenseTableHeader>
                      <DenseTableBody>
                        {step.rows.map((r) => (
                          <DenseTableRow
                            key={`${r.dateStr}|${r.closeExecutionId}|${r.openExecutionId}|${r.qty}`}
                          >
                            <DenseTableCell className={denseTableNumCell}>
                              {r.qty.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                            </DenseTableCell>
                            <DenseTableCell className="font-mono text-dense-meta text-entity-option">
                              {shortOptContractKey(r.closeContractKey)}
                            </DenseTableCell>
                            <DenseTableCell className="font-mono text-dense-meta text-entity-option">
                              {shortOptContractKey(r.openContractKey)}
                            </DenseTableCell>
                            <DenseTableCell className={`${denseTableNumCell} ${pnlColorClass(r.bookCloseRealized)}`}>
                              {fmtUsd(r.bookCloseRealized)}
                            </DenseTableCell>
                            <DenseTableCell className={`${denseTableNumCell} ${pnlColorClass(r.cashRoll)}`}>
                              {fmtUsd(r.cashRoll)}
                            </DenseTableCell>
                            <DenseTableCell className={`${denseTableNumCell} font-semibold ${pnlColorClass(r.adj)}`}>
                              {fmtUsd(r.adj)}
                            </DenseTableCell>
                          </DenseTableRow>
                        ))}
                      </DenseTableBody>
                    </DenseDataTable>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

export default function OptionsModeBridgePanel({
  byDayRangeData,
  openUnrealized,
  sameDayRolls,
  asOfDateStr,
}: {
  byDayRangeData: ByDayRangeData | null
  openUnrealized: number
  sameDayRolls: SameDayRollEvent[]
  asOfDateStr: string | null
  optionsPnLMode?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [expandedUnd, setExpandedUnd] = useState<Set<string>>(() => new Set())
  const [expandedChain, setExpandedChain] = useState<Set<string>>(() => new Set())
  const [expandedDay, setExpandedDay] = useState<Set<string>>(() => new Set())
  const [bodyHeight, setBodyHeight] = useState(readStoredBodyHeight)

  const summary = useMemo(() => {
    if (!byDayRangeData) return null
    return buildOptionsModeBridgeSummary({
      byDayRangeData,
      openUnrealized,
      sameDayRolls,
    })
  }, [byDayRangeData, openUnrealized, sameDayRolls])

  const groups = useMemo(
    () => groupSameDayRollsByUndAndChain(sameDayRolls),
    [sameDayRolls],
  )

  const toggleSet = (setter: Dispatch<SetStateAction<Set<string>>>, key: string) => {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startY = e.clientY
      const startH = bodyHeight
      const onMove = (ev: MouseEvent) => {
        const next = Math.min(BODY_H_MAX, Math.max(BODY_H_MIN, startH + (ev.clientY - startY)))
        setBodyHeight(next)
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        setBodyHeight((h) => {
          try {
            localStorage.setItem(BODY_H_STORAGE_KEY, String(h))
          } catch {
            /* ignore */
          }
          return h
        })
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
    },
    [bodyHeight],
  )

  if (!summary || (groups.length === 0 && Math.abs(summary.sumRollAdj) < 0.005)) {
    return null
  }

  const headStats: { label: string; value: number; tone: string; title?: string }[] = [
    { label: 'Book R', value: summary.bookR, tone: pnlColorClass(summary.bookR) },
    { label: 'Σ roll adj', value: summary.sumRollAdj, tone: pnlColorClass(summary.sumRollAdj) },
    { label: 'Economic', value: summary.economic, tone: pnlColorClass(summary.economic) },
    { label: 'Open', value: summary.open, tone: 'text-secondary-foreground' },
    { label: 'Total', value: summary.total, tone: pnlColorClass(summary.total) },
    { label: 'Econ − Total', value: summary.econMinusTotal, tone: pnlColorClass(summary.econMinusTotal), title: 'Economic − Total (= Σ roll adj − Open)' },
  ]

  return (
    <section className={perfUi.panel} aria-label="Options path bridge">
      <div className="flex items-center rounded-t-md bg-secondary/40">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((o) => !o)}
          className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-2.5 border-0 bg-transparent px-3 py-2 text-left text-foreground hover:bg-secondary"
        >
          <CollapsibleChevron expanded={expanded} className={cn('h-3 w-3', expanded ? 'rotate-0' : '-rotate-90')} />
          <span className={perfUi.cap}>Options path bridge</span>
          <span className={perfUi.panelTitle}>Book → Economic → Total</span>
          <span className="ml-auto flex flex-wrap gap-x-3.5 gap-y-1">
            {headStats.map((h) => (
              <span key={h.label} className="flex items-baseline gap-1.25" title={h.title}>
                <span className={cn(perfUi.cap, 'text-dense-micro')}>{h.label}</span>
                <span className={cn(perfUi.mono, 'text-dense-body font-semibold', h.tone)}>{fmtUsd(h.value)}</span>
              </span>
            ))}
          </span>
        </button>
        <span className="pr-3">
          <InfoTooltip text={BRIDGE_HELP} />
        </span>
      </div>

      {expanded ? (
        <div className="border-t border-border pb-1">
          <p className={cn(perfUi.mono, 'my-0 border-b border-border/50 px-3 py-1.75 text-dense-meta text-muted-foreground')}>
            Economic = Book R + Σ roll adj · Total = Book R + Open
            {asOfDateStr ? ` (as of ${fmtIsoDateToken(asOfDateStr)})` : ''}.
            {' '}Underlying → chain → roll day (cash statement) → fills.
          </p>
          {groups.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No same-day option rolls in this range.</p>
          ) : (
            <div className="flex min-w-0 flex-col">
              {/* The stored height caps the tree; a short tree takes only the room it needs. */}
              <div className="min-h-0 overflow-auto" style={{ maxHeight: bodyHeight }}>
                {groups.map((g) => {
                  const undOpen = expandedUnd.has(g.underlying)
                  return (
                    <div key={g.underlying} className="min-w-0 border-b border-border/40 last:border-b-0">
                      <BridgeNode
                        open={undOpen}
                        onToggle={() => toggleSet(setExpandedUnd, g.underlying)}
                        indent={0}
                        tail={`Book close ${fmtUsd(g.bookClose)} · Cash ${fmtUsd(g.cashRoll)}`}
                      >
                        <span className="font-mono font-bold text-entity-option">{g.underlying}</span>
                        <span className="text-dense-meta text-muted-foreground">
                          {g.chains.length} chain{g.chains.length === 1 ? '' : 's'} · {g.rolls} roll{g.rolls === 1 ? '' : 's'}
                        </span>
                        <Figure label="Adj" value={g.adj} />
                      </BridgeNode>
                      {undOpen
                        ? g.chains.map((c) => {
                            const chainOpen = expandedChain.has(c.id)
                            return (
                              <div key={c.id} className="min-w-0">
                                <BridgeNode open={chainOpen} onToggle={() => toggleSet(setExpandedChain, c.id)} indent={1}>
                                  <span className="font-mono text-entity-option">
                                    {c.optionRight} · {c.pathLabel}
                                  </span>
                                  <span className="text-dense-meta text-muted-foreground">
                                    {c.rolls} roll{c.rolls === 1 ? '' : 's'}
                                  </span>
                                  <Figure label="Adj" value={c.adj} />
                                </BridgeNode>
                                {chainOpen ? (
                                  <ChainDayBlocks
                                    chain={c}
                                    expandedDay={expandedDay}
                                    onToggleDay={(k) => toggleSet(setExpandedDay, k)}
                                  />
                                ) : null}
                              </div>
                            )
                          })
                        : null}
                    </div>
                  )
                })}
              </div>
              <div
                className="h-1.5 shrink-0 cursor-ns-resize rounded-b-sm bg-transparent hover:bg-primary/25 transition-colors"
                onMouseDown={onResizeStart}
                title="Drag to resize"
                aria-label="Resize Options path bridge height"
                role="separator"
              />
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
