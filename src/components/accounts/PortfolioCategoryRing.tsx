import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import { isLedgerFixedIncomeCategory, isLedgerCashLikeCategory, ibPositionMarketValue } from '@/utils/stockCategories'
import type { IbAccountSnapshot } from '@/types/monitor'

// Ring geometry constants
const CX = 66
const CY = 66
const R_OUTER = 56
const R_INNER = 36
const R_MID = (R_OUTER + R_INNER) / 2
const RING_STROKE = R_OUTER - R_INNER
const CIRC = 2 * Math.PI * R_MID

// Segment colors (hex) — consistent with legacy palette
const COLOR_STOCK = '#38bdf8'
const COLOR_FI = '#fbbf24'
const COLOR_CASH = '#2dd4bf'
const COLOR_OPT = '#c084fc'

interface RingSegment {
  frac: number
  color: string
}

function buildSegments(
  pStock: number,
  pFi: number,
  pCash: number,
  pOpt: number,
  includeFi: boolean,
  includeOpt: boolean,
): RingSegment[] {
  const segs: RingSegment[] = [{ frac: pStock, color: COLOR_STOCK }]
  if (includeFi) segs.push({ frac: pFi, color: COLOR_FI })
  segs.push({ frac: pCash, color: COLOR_CASH })
  if (includeOpt) segs.push({ frac: pOpt, color: COLOR_OPT })
  return segs
}

function ToggleGroup({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex rounded-md border overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            'px-2 py-0.5 transition-colors',
            !value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          )}
        >
          Excl
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            'px-2 py-0.5 transition-colors',
            value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          )}
        >
          Incl
        </button>
      </div>
    </div>
  )
}

interface Props {
  accounts: IbAccountSnapshot[]
}

interface LegendRowProps {
  color: string
  label: string
  pct: string
  value: string
  dimmed?: boolean
  tooltip?: string
}

function LegendRow({ color, label, pct, value, dimmed, tooltip }: LegendRowProps) {
  return (
    <div
      className={cn('flex items-center gap-2 text-xs', dimmed && 'opacity-50')}
      title={tooltip}
    >
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="w-14 text-right font-mono text-muted-foreground">{pct}</span>
      <span className="w-24 text-right font-mono">{value}</span>
    </div>
  )
}

export function PortfolioCategoryRing({ accounts }: Props) {
  const [includeFi, setIncludeFi] = useState(false)
  const [includeOpt, setIncludeOpt] = useState(true)

  const pie = useMemo(() => {
    let coreStockMV = 0
    let fixedIncomeMV = 0
    let cashLikeMV = 0
    let optionsMV = 0
    let totalCash = 0
    let totalNetLiq = 0

    for (const account of accounts) {
      const cash = parseFloat(String(account.summary?.TotalCashValue ?? '0'))
      if (Number.isFinite(cash)) totalCash += cash
      const nlq = parseFloat(String(account.summary?.NetLiquidation ?? '0'))
      if (Number.isFinite(nlq)) totalNetLiq += nlq

      for (const pos of account.positions ?? []) {
        const st = (pos.secType ?? '').toUpperCase()
        const mv = ibPositionMarketValue(pos)
        if (st === 'OPT') {
          optionsMV += mv
          continue
        }
        const cat = String(pos.category ?? '').trim()
        if (isLedgerFixedIncomeCategory(cat)) fixedIncomeMV += mv
        else if (isLedgerCashLikeCategory(cat)) cashLikeMV += mv
        else coreStockMV += mv
      }
    }

    const wCash = Math.max(0, totalCash)
    const cashMergedMV = wCash + Math.max(0, cashLikeMV)
    const wCore = Math.max(0, coreStockMV)
    const wFi = Math.max(0, fixedIncomeMV)
    const wOpt = Math.max(0, optionsMV)

    const wFiIn = includeFi ? wFi : 0
    const wOptIn = includeOpt ? wOpt : 0
    const denom = wCore + wFiIn + cashMergedMV + wOptIn

    const pStock = denom > 0 ? wCore / denom : 0
    const pFi = denom > 0 && includeFi ? wFi / denom : 0
    const pCash = denom > 0 && cashMergedMV > 0 ? cashMergedMV / denom : 0
    const pOpt = denom > 0 && includeOpt ? wOpt / denom : 0

    const netLiq = totalNetLiq > 0 ? totalNetLiq : null
    const ringHasData = wCore + wFi + cashMergedMV + wOpt > 0

    return {
      coreStockMV: wCore,
      fixedIncomeMV: wFi,
      cashMergedMV,
      optionsMV: wOpt,
      denom,
      pStock,
      pFi,
      pCash,
      pOpt,
      netLiq,
      ringHasData,
    }
  }, [accounts, includeFi, includeOpt])

  if (!pie.ringHasData) return null

  const { coreStockMV, fixedIncomeMV, cashMergedMV, optionsMV, denom, pStock, pFi, pCash, pOpt, netLiq } = pie

  const centerMain = netLiq != null ? fmtUsd(netLiq) : denom > 0 ? fmtUsd(denom) : '—'
  const centerSub = netLiq != null ? 'Net liq.' : denom > 0 ? 'Chart basis' : ''

  // Build ring segments with cumulative offset
  const segments = buildSegments(pStock, pFi, pCash, pOpt, includeFi, includeOpt)
  let ringOff = 0
  const ringCircles: React.ReactNode[] = []
  for (const seg of segments) {
    const len = Math.max(0, seg.frac) * CIRC
    if (len >= 0.5) {
      ringCircles.push(
        <circle
          key={seg.color}
          cx={CX}
          cy={CY}
          r={R_MID}
          fill="none"
          stroke={seg.color}
          strokeWidth={RING_STROKE}
          strokeLinecap="butt"
          strokeDasharray={`${len} ${CIRC}`}
          strokeDashoffset={-ringOff}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
      )
      ringOff += len
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-secondary p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Portfolio by Category
      </p>
      <div className="mt-3 flex min-h-0 flex-1 items-center gap-6">
        <div className="flex shrink-0 flex-col items-center justify-center">
          <svg
            width={132}
            height={132}
            viewBox="0 0 132 132"
            aria-label="Portfolio by category ring chart"
            role="img"
          >
            <circle
              cx={CX}
              cy={CY}
              r={R_MID}
              fill="none"
              stroke="currentColor"
              strokeWidth={RING_STROKE}
              className="opacity-10"
            />
            {ringCircles}
            <text
              x={CX}
              y={CY - 4}
              textAnchor="middle"
              dominantBaseline="auto"
              fill="currentColor"
              fontSize={netLiq != null ? 9 : 11}
              fontWeight="600"
              fontFamily="ui-monospace, monospace"
            >
              {centerMain}
            </text>
            <text
              x={CX}
              y={CY + 10}
              textAnchor="middle"
              dominantBaseline="auto"
              fill="currentColor"
              fontSize={9}
              className="opacity-60"
            >
              {centerSub}
            </text>
          </svg>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center space-y-2">
          <LegendRow
            color={COLOR_STOCK}
            label="Stock"
            pct={denom > 0 ? `${(pStock * 100).toFixed(1)}%` : '—'}
            value={fmtUsd(coreStockMV)}
          />
          <LegendRow
            color={COLOR_FI}
            label="Fixed income"
            pct={includeFi && denom > 0 ? `${(pFi * 100).toFixed(1)}%` : '—'}
            value={fmtUsd(fixedIncomeMV)}
            dimmed={!includeFi}
            tooltip={!includeFi ? 'Excluded from ring denominator' : undefined}
          />
          <LegendRow
            color={COLOR_CASH}
            label="Cash + Cash-like"
            pct={denom > 0 && cashMergedMV > 0 ? `${(pCash * 100).toFixed(1)}%` : '—'}
            value={fmtUsd(cashMergedMV)}
          />
          <LegendRow
            color={COLOR_OPT}
            label="Options"
            pct={includeOpt && denom > 0 ? `${(pOpt * 100).toFixed(1)}%` : '—'}
            value={fmtUsd(optionsMV)}
            dimmed={!includeOpt}
            tooltip={!includeOpt ? 'Excluded from ring denominator' : undefined}
          />
        </div>
      </div>

      <div className="mt-auto grid grid-cols-1 gap-2 border-t border-border/60 pt-3 sm:grid-cols-2">
        <ToggleGroup label="Fixed income" value={includeFi} onChange={setIncludeFi} />
        <ToggleGroup label="Options" value={includeOpt} onChange={setIncludeOpt} />
      </div>
    </div>
  )
}
