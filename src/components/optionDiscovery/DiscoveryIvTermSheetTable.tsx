import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTableNumCell,
} from '@/components/data-display'
import type { IvTermPoint, IvVolConePoint } from './OptionDiscoveryAnalytics'

export const CONE_MIN_DAILY_SAMPLES = 5

const TOOLTIP_SAMPLES_VS_REQ = (actual: number, req: number) =>
  `Expected: at least ${req} calendar days in the lookback window where a daily ATM IV can be computed from historical snapshots (near-ATM strikes, valid IV, underlying spot from stock_day Massive bars aligned to option day_last_updated). Actual: ${actual}. To satisfy: keep ingesting chain snapshots and stock_day so rows accumulate; a wider strike grid helps when spot moves. The orange cone line uses option_snapshots_latest and does not require this count.`

const TOOLTIP_BAND_CELLS_NA = (actual: number, req: number) =>
  `P10–P90 / Min / Max are hidden until daily samples reach ${req} (currently ${actual}). See Samples (act. / req.) column.`

function IvSheetHoverCell({
  warn,
  detail,
  children,
}: {
  warn?: boolean
  detail: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'group relative inline-flex max-w-full cursor-help align-middle',
        warn && 'font-semibold text-amber-600 dark:text-amber-400',
      )}
    >
      <span
        className={cn(
          'border-b border-dotted',
          warn ? 'border-amber-600 dark:border-amber-400' : 'border-muted-foreground',
        )}
      >
        {children}
      </span>
      <span
        className="pointer-events-none absolute left-1/2 top-full z-[120] mt-1.5 hidden min-w-56 max-w-[22rem] -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-xs font-normal leading-snug text-muted-foreground shadow-md group-hover:block"
        role="tooltip"
      >
        {detail}
      </span>
    </span>
  )
}

export type MergedIvRow = {
  expiration: string
  dte: number
  term?: IvTermPoint
  cone?: IvVolConePoint
}

type Props = {
  mergedIvRows: MergedIvRow[]
  coneError: string | null
  termRows: IvTermPoint[]
  fmtIvPct: (v: number | null | undefined) => string
}

export function DiscoveryIvTermSheetTable({ mergedIvRows, coneError, termRows, fmtIvPct }: Props) {
  return (
    <DenseDataTable wrapClassName="border-0 rounded-none" tableClassName="text-xs">
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead className="text-left normal-case tracking-normal">Exp</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>DTE</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>ATM</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>C</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>P</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>Str</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>
            ACT/REQ
            <InfoTooltip
              text={`Minimum ${CONE_MIN_DAILY_SAMPLES} daily ATM IV points in the lookback are required for cone p10–p90 bands. Hover this column or P10–Max when highlighted.`}
            />
          </DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>
            Bnd
            <InfoTooltip text="OK = enough daily samples for percentile bands. Inc = incomplete; hover ACT/REQ or status." />
          </DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>P10</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>P50</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>P90</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>Mn</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>Mx</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {mergedIvRows.length === 0 ? (
          <DenseTableRow>
            <DenseTableCell colSpan={13} className="text-center italic text-muted-foreground">
              {coneError && !termRows.length ? 'Failed to load data.' : 'No rows.'}
            </DenseTableCell>
          </DenseTableRow>
        ) : (
          mergedIvRows.map(({ expiration, dte, term, cone }) => {
            const actual = cone?.sample_days ?? 0
            const req = CONE_MIN_DAILY_SAMPLES
            const bandsOk = cone != null && actual >= req
            const rowWarn = cone != null && !bandsOk
            const pctCell = (v: number | null | undefined) => {
              if (cone == null) return '—'
              if (v != null && Number.isFinite(v)) return fmtIvPct(v)
              if (bandsOk) return '—'
              return (
                <IvSheetHoverCell warn detail={TOOLTIP_BAND_CELLS_NA(actual, req)}>
                  —
                </IvSheetHoverCell>
              )
            }
            return (
              <DenseTableRow key={expiration} className={rowWarn ? 'bg-amber-500/10' : undefined}>
                <DenseTableCell className="text-left tabular-nums">{expiration}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{dte}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtIvPct(term?.atm_iv ?? cone?.atm_iv)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtIvPct(term?.iv_call)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtIvPct(term?.iv_put)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {term?.strike != null && Number.isFinite(term.strike) ? term.strike.toFixed(2) : '—'}
                </DenseTableCell>
                <DenseTableCell
                  className={cn(denseTableNumCell, rowWarn && 'text-amber-600 dark:text-amber-400')}
                >
                  {cone == null ? (
                    '—'
                  ) : (
                    <IvSheetHoverCell warn={!bandsOk} detail={TOOLTIP_SAMPLES_VS_REQ(actual, req)}>
                      <span title={`${actual} / ${req} daily samples`}>
                        <span className="font-semibold">{actual}</span>
                        <span className="text-muted-foreground">/</span>
                        {req}
                      </span>
                    </IvSheetHoverCell>
                  )}
                </DenseTableCell>
                <DenseTableCell
                  className={cn(denseTableNumCell, rowWarn && 'text-amber-600 dark:text-amber-400')}
                >
                  {cone == null ? (
                    '—'
                  ) : bandsOk ? (
                    'OK'
                  ) : (
                    <IvSheetHoverCell warn detail={TOOLTIP_SAMPLES_VS_REQ(actual, req)}>
                      <span title="Incomplete">Inc</span>
                    </IvSheetHoverCell>
                  )}
                </DenseTableCell>
                <DenseTableCell
                  className={cn(denseTableNumCell, !bandsOk && cone != null && 'text-muted-foreground')}
                >
                  {pctCell(cone?.iv_p10)}
                </DenseTableCell>
                <DenseTableCell
                  className={cn(denseTableNumCell, !bandsOk && cone != null && 'text-muted-foreground')}
                >
                  {pctCell(cone?.iv_p50)}
                </DenseTableCell>
                <DenseTableCell
                  className={cn(denseTableNumCell, !bandsOk && cone != null && 'text-muted-foreground')}
                >
                  {pctCell(cone?.iv_p90)}
                </DenseTableCell>
                <DenseTableCell
                  className={cn(denseTableNumCell, !bandsOk && cone != null && 'text-muted-foreground')}
                >
                  {pctCell(cone?.iv_min)}
                </DenseTableCell>
                <DenseTableCell
                  className={cn(denseTableNumCell, !bandsOk && cone != null && 'text-muted-foreground')}
                >
                  {pctCell(cone?.iv_max)}
                </DenseTableCell>
              </DenseTableRow>
            )
          })
        )}
      </DenseTableBody>
    </DenseDataTable>
  )
}
