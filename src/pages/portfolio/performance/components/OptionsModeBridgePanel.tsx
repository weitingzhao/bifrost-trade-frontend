import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import {
  CollapsibleChevron,
  CollapsibleBucketHeader,
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
import { pnlColorClass, unrealizedPnlColorClass } from '@/utils/dailyChange'
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
          <div key={dayKey} className="ml-3 min-w-0 border-l border-border/40 pl-2">
            <CollapsibleBucketHeader
              expanded={dayOpen}
              onToggle={() => onToggleDay(dayKey)}
              label={
                <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="font-mono tabular-nums font-semibold text-foreground">{fmtIsoDateToken(day.dateStr)}</span>
                  <span className="text-dense-meta font-normal text-muted-foreground">
                    Cash statement
                  </span>
                  <span className={`text-dense-meta font-normal tabular-nums ${pnlColorClass(day.cashRoll)}`}>
                    Cash roll {fmtUsd(day.cashRoll)}
                  </span>
                  <span className={`text-dense-meta font-normal tabular-nums ${pnlColorClass(day.bookClose)}`}>
                    Book close {fmtUsd(day.bookClose)}
                  </span>
                  <span className={`text-dense-meta font-normal tabular-nums ${pnlColorClass(day.adj)}`}>
                    Adj {fmtUsd(day.adj)}
                  </span>
                  <span className="text-dense-meta font-normal text-muted-foreground">
                    {day.fills} fill{day.fills === 1 ? '' : 's'} · {stepHint}
                  </span>
                </span>
              }
            />
            {dayOpen ? (
              <div className="space-y-2 pb-1">
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
                    <DenseDataTable wrapClassName="rounded-sm" tableClassName="min-w-[640px]">
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
                          <DenseTableHead className="text-right">Qty</DenseTableHead>
                          <DenseTableHead>Close</DenseTableHead>
                          <DenseTableHead>Open to</DenseTableHead>
                          <DenseTableHead className="text-right">Book close</DenseTableHead>
                          <DenseTableHead className="text-right">Cash roll</DenseTableHead>
                          <DenseTableHead className="text-right">Adj</DenseTableHead>
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
    { label: 'Open', value: summary.open, tone: unrealizedPnlColorClass(summary.open) },
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
        <div className="border-t border-border px-3 pb-1">
          <p className={cn(perfUi.mono, 'my-0 border-b border-border/50 py-1.75 text-dense-meta text-muted-foreground')}>
            Economic = Book R + Σ roll adj · Total = Book R + Open
            {asOfDateStr ? ` (as of ${fmtIsoDateToken(asOfDateStr)})` : ''}.
            {' '}Underlying → chain → roll day (cash statement) → fills.
          </p>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No same-day option rolls in this range.</p>
          ) : (
            <div className="flex flex-col min-w-0" style={{ height: bodyHeight }}>
              <div className="min-h-0 flex-1 overflow-auto">
                {groups.map((g) => {
                  const undOpen = expandedUnd.has(g.underlying)
                  return (
                    <div key={g.underlying} className="min-w-0">
                      <CollapsibleBucketHeader
                        expanded={undOpen}
                        onToggle={() => toggleSet(setExpandedUnd, g.underlying)}
                        label={
                          <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                            <span className="font-mono font-bold text-sky-400">{g.underlying}</span>
                            <span className="text-dense-meta font-normal text-muted-foreground">
                              {g.chains.length} chain{g.chains.length === 1 ? '' : 's'} · {g.rolls} roll
                              {g.rolls === 1 ? '' : 's'}
                            </span>
                            <span className={`text-dense-meta font-normal tabular-nums ${pnlColorClass(g.adj)}`}>
                              Adj {fmtUsd(g.adj)}
                            </span>
                            <span className="text-dense-meta font-normal tabular-nums text-muted-foreground">
                              Book close {fmtUsd(g.bookClose)} · Cash {fmtUsd(g.cashRoll)}
                            </span>
                          </span>
                        }
                      />
                      {undOpen
                        ? g.chains.map((c) => {
                            const chainOpen = expandedChain.has(c.id)
                            return (
                              <div key={c.id} className="ml-3 min-w-0 border-l border-border/50 pl-2">
                                <CollapsibleBucketHeader
                                  expanded={chainOpen}
                                  onToggle={() => toggleSet(setExpandedChain, c.id)}
                                  label={
                                    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                                      <span className="font-mono text-dense-meta text-entity-option font-semibold">
                                        {c.optionRight} · {c.pathLabel}
                                      </span>
                                      <span className="text-dense-meta font-normal text-muted-foreground">
                                        {c.rolls} roll{c.rolls === 1 ? '' : 's'}
                                      </span>
                                      <span className={`text-dense-meta font-normal tabular-nums ${pnlColorClass(c.adj)}`}>
                                        Adj {fmtUsd(c.adj)}
                                      </span>
                                    </span>
                                  }
                                />
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
