import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useStockStatements } from '@/hooks/useStockStatements'
import type { SymbolStatementsData } from '@/types/research'
import { SvgBarChart } from './charts/SvgBarChart'
import { SvgAreaChart } from './charts/SvgAreaChart'
import { SectionCollapseToggle } from './SectionCollapseToggle'
import { INSPECTOR_SECTION_NAV_BY_ID } from './stockInspectorSections'
import styles from './stock-inspector.module.css'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import { colRange, fmtM, fmtPct2, fmtRatio } from './stockInspectorUtils'

interface Props {
  symbol: string
  sectionId?: string
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

function periodLabel(year: number, quarter: number): string {
  return `Q${quarter}'${String(year).slice(2)}`
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span>
      <span className={styles.pcrLegendSwatch} style={{ background: color }} />
      {label}
    </span>
  )
}

function StmtBlock({
  title,
  legend,
  chart,
  table,
}: {
  title: string
  legend?: ReactNode
  chart?: ReactNode
  table: ReactNode
}) {
  return (
    <div className={styles.pcrChartBlock}>
      <div className={styles.pcrChartHead}>
        <span className={styles.pcrChartTitle}>
          <span className={styles.pcrTitleMark} aria-hidden />
          {title}
        </span>
        {legend ? <div className={styles.pcrLegend}>{legend}</div> : null}
      </div>
      {chart ? <div className={styles.pcrChartFrame}>{chart}</div> : null}
      <div className={styles.stmtsTableWrap}>{table}</div>
    </div>
  )
}

function StatementsBody({ stmts }: { stmts: SymbolStatementsData }) {
  const allCf = stmts.cash_flows

  return (
    <>
      {stmts.balance_sheets.length > 0 && (() => {
        const bs = [...stmts.balance_sheets].reverse()
        const lbls = bs.map((r) => periodLabel(r.fiscal_year, r.fiscal_quarter))
        return (
          <StmtBlock
            title="Balance Sheet"
            legend={
              <>
                <LegendItem color="rgba(74,222,128,0.85)" label="Cash" />
                <LegendItem color="rgba(56,189,248,0.85)" label="Equity" />
                <LegendItem color="rgba(248,113,113,0.75)" label="LT Debt" />
              </>
            }
            chart={
              <SvgBarChart
                className={styles.pcrChart}
                labels={lbls}
                h={120}
                series={[
                  { key: 'Cash', color: 'rgba(74,222,128,0.82)', values: bs.map((r) => r.cash_and_equivalents) },
                  { key: 'Equity', color: 'rgba(56,189,248,0.82)', values: bs.map((r) => r.total_equity) },
                  {
                    key: 'LT Debt',
                    color: 'rgba(248,113,113,0.72)',
                    values: bs.map((r) => r.long_term_debt_and_capital_lease_obligations),
                  },
                ]}
              />
            }
            table={
              <table className={styles.stmtDataTable}>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Cash</th>
                    <th>Equity</th>
                    <th>LT Debt</th>
                    <th>Retained</th>
                  </tr>
                </thead>
                <tbody>
                  {stmts.balance_sheets.map((r) => (
                    <tr key={r.period_end}>
                      <td>{periodLabel(r.fiscal_year, r.fiscal_quarter)}</td>
                      <td>{fmtM(r.cash_and_equivalents)}</td>
                      <td>{fmtM(r.total_equity)}</td>
                      <td>{fmtM(r.long_term_debt_and_capital_lease_obligations)}</td>
                      <td
                        className={
                          r.retained_earnings_deficit != null && r.retained_earnings_deficit < 0
                            ? styles.stmtsNeg
                            : undefined
                        }
                      >
                        {fmtM(r.retained_earnings_deficit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          />
        )
      })()}

      {stmts.cash_flows.length > 0 && (() => {
        const cf = [...stmts.cash_flows].reverse()
        const lbls = cf.map((r) => periodLabel(r.fiscal_year, r.fiscal_quarter))
        const [minNI, maxNI] = colRange(allCf.map((r) => r.net_income))
        const [minOp, maxOp] = colRange(allCf.map((r) => r.net_cash_from_operating_activities))
        return (
          <StmtBlock
            title="Cash Flow"
            legend={
              <>
                <LegendItem color="rgba(74,222,128,0.85)" label="Net Inc" />
                <LegendItem color="rgba(99,179,237,0.85)" label="Op CF" />
              </>
            }
            chart={
              <SvgBarChart
                className={styles.pcrChart}
                labels={lbls}
                h={120}
                series={[
                  {
                    key: 'Net Income',
                    color: 'rgba(74,222,128,0.82)',
                    negColor: 'rgba(248,113,113,0.75)',
                    values: cf.map((r) => r.net_income),
                  },
                  {
                    key: 'Op CF',
                    color: 'rgba(99,179,237,0.82)',
                    negColor: 'rgba(248,113,113,0.65)',
                    values: cf.map((r) => r.net_cash_from_operating_activities),
                  },
                ]}
              />
            }
            table={
              <table className={styles.stmtDataTable}>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Net Inc</th>
                    <th>Op CF</th>
                    <th>Inv CF</th>
                    <th>Capex</th>
                  </tr>
                </thead>
                <tbody>
                  {allCf.map((r) => (
                    <tr key={r.period_end}>
                      <td>{periodLabel(r.fiscal_year, r.fiscal_quarter)}</td>
                      <td
                        className={cn(
                          styles.miniBarCell,
                          r.net_income != null && r.net_income < 0 ? styles.stmtsNeg : styles.stmtsPos,
                        )}
                      >
                        {fmtM(r.net_income)}
                        <MiniBarInline value={r.net_income} min={minNI} max={maxNI} />
                      </td>
                      <td
                        className={cn(
                          styles.miniBarCell,
                          r.net_cash_from_operating_activities != null &&
                            r.net_cash_from_operating_activities < 0
                            ? styles.stmtsNeg
                            : styles.stmtsPos,
                        )}
                      >
                        {fmtM(r.net_cash_from_operating_activities)}
                        <MiniBarInline
                          value={r.net_cash_from_operating_activities}
                          min={minOp}
                          max={maxOp}
                        />
                      </td>
                      <td
                        className={
                          r.net_cash_from_investing_activities != null &&
                          r.net_cash_from_investing_activities < 0
                            ? styles.stmtsNeg
                            : styles.stmtsPos
                        }
                      >
                        {fmtM(r.net_cash_from_investing_activities)}
                      </td>
                      <td>{fmtM(r.purchase_of_property_plant_and_equipment)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          />
        )
      })()}

      {stmts.ratios.length > 0 && (
        <StmtBlock
          title="Ratios (TTM)"
          table={
            <table className={styles.stmtDataTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>P/E</th>
                  <th>P/S</th>
                  <th>P/B</th>
                  <th>D/E</th>
                  <th>ROE</th>
                  <th>ROA</th>
                  <th>EPS</th>
                  <th>Mkt Cap</th>
                </tr>
              </thead>
              <tbody>
                {stmts.ratios.map((r) => (
                  <tr key={r.date}>
                    <td>{r.date}</td>
                    <td>{fmtRatio(r.price_to_earnings)}</td>
                    <td>{fmtRatio(r.price_to_sales)}</td>
                    <td>{fmtRatio(r.price_to_book)}</td>
                    <td>{fmtRatio(r.debt_to_equity)}</td>
                    <td>{fmtPct2(r.return_on_equity)}</td>
                    <td>{fmtPct2(r.return_on_assets)}</td>
                    <td>{r.earnings_per_share != null ? `$${r.earnings_per_share.toFixed(2)}` : '—'}</td>
                    <td>{fmtM(r.market_cap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />
      )}

      {stmts.short_interest.length > 0 && (() => {
        const si = [...stmts.short_interest].reverse()
        const lbls = si.map((r) => r.settlement_date.slice(5).replace('-', '/'))
        return (
          <StmtBlock
            title="Short Interest"
            legend={<LegendItem color="rgba(248,113,113,0.8)" label="Shares Short" />}
            chart={
              <>
                <SvgBarChart
                  className={styles.pcrChart}
                  labels={lbls}
                  h={120}
                  series={[
                    {
                      key: 'Short Interest',
                      color: 'rgba(248,113,113,0.75)',
                      values: si.map((r) => r.short_interest),
                    },
                  ]}
                />
                <SvgAreaChart
                  className={styles.pcrChart}
                  labels={lbls}
                  values={si.map((r) => r.days_to_cover)}
                  color="rgba(251,191,36,0.9)"
                  areaColor="rgba(251,191,36,0.1)"
                  h={72}
                />
              </>
            }
            table={
              <table className={styles.stmtDataTable}>
                <thead>
                  <tr>
                    <th>Settlement</th>
                    <th>Short Int</th>
                    <th>Avg Vol</th>
                    <th>Days</th>
                  </tr>
                </thead>
                <tbody>
                  {stmts.short_interest.map((r) => (
                    <tr key={r.settlement_date}>
                      <td>{r.settlement_date.slice(5)}</td>
                      <td>{fmtM(r.short_interest)}</td>
                      <td>{fmtM(r.avg_daily_volume)}</td>
                      <td>{r.days_to_cover != null ? r.days_to_cover.toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          />
        )
      })()}

      {stmts.short_volume.length > 0 && (
        <StmtBlock
          title="Short Volume"
          table={
            <table className={styles.stmtDataTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Short Vol</th>
                  <th>Ratio</th>
                  <th>Total Vol</th>
                </tr>
              </thead>
              <tbody>
                {stmts.short_volume.map((r) => (
                  <tr key={r.trade_date}>
                    <td>{r.trade_date}</td>
                    <td>{fmtM(r.short_volume)}</td>
                    <td>
                      {r.short_volume_ratio != null
                        ? `${(r.short_volume_ratio * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                    <td>{fmtM(r.total_volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />
      )}
    </>
  )
}

function MiniBarInline({
  value,
  min,
  max,
}: {
  value: number | null
  min: number
  max: number
}) {
  if (value == null || !Number.isFinite(value) || max === min) return null
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const color = value >= 0 ? 'rgba(74,222,128,0.28)' : 'rgba(248,113,113,0.28)'
  return (
    <div className={styles.miniBar} style={{ width: `${pct}%`, background: color }} />
  )
}

export function StockStatementsSection({
  symbol,
  sectionId = 'stock-inspector-statements',
  expanded = true,
  onExpandedChange,
}: Props) {
  const { data: stmts, isLoading, isError } = useStockStatements(symbol, expanded)

  const hasAny =
    stmts &&
    (stmts.balance_sheets.length > 0 ||
      stmts.cash_flows.length > 0 ||
      stmts.ratios.length > 0 ||
      stmts.short_interest.length > 0 ||
      stmts.short_volume.length > 0)

  return (
    <section id={sectionId} className={inspectorShell.section} aria-labelledby="stock-inspector-stmts">
      <SectionCollapseToggle
        id="stock-inspector-stmts"
        navItem={INSPECTOR_SECTION_NAV_BY_ID.statements}
        expanded={expanded}
        onToggle={() => onExpandedChange?.(!expanded)}
        className="mb-2"
      />

      {expanded && (
        <>
          {isLoading && <p className={styles.hint}>Loading…</p>}
          {isError && !stmts?.ok && (
            <p className={cn(styles.hint, styles.hintErr)}>Failed to load statements.</p>
          )}
          {stmts?.ok && hasAny && <StatementsBody stmts={stmts} />}
          {stmts?.ok && !hasAny && !isLoading && (
            <p className={styles.hint}>No statement data found for this symbol.</p>
          )}
        </>
      )}
    </section>
  )
}
