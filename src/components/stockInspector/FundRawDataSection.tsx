import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { FundRawData } from '@/types/research'
import { computeFundRawHighlight } from './fundRawHighlight'
import { MiniBar } from './MiniBar'
import styles from './stock-inspector.module.css'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import { colRange, fmtEps, fmtRev } from './stockInspectorUtils'

interface Props {
  loading: boolean
  data: FundRawData | undefined
  activeCond: string | null
}

export function FundRawDataSection({ loading, data, activeCond }: Props) {
  const highlight = useMemo(
    () => computeFundRawHighlight(activeCond, data),
    [activeCond, data],
  )

  if (!loading && (!data || (data.quarterly.length === 0 && data.annual.length === 0))) {
    return null
  }

  return (
    <section className={inspectorShell.section} aria-labelledby="stock-inspector-raw">
      <div id="stock-inspector-raw" className={inspectorShell.sectionTitle}>
        <span>Source Data</span>
        {activeCond && highlight.col && (
          <span className={inspectorShell.sectionTitleAsOf}>
            — {activeCond.replace(/_/g, ' ')} ({highlight.col === 'eps' ? 'EPS' : 'Revenue'})
          </span>
        )}
      </div>
      {loading && <p className={styles.hint}>Loading source data…</p>}

      {data && data.quarterly.length > 0 && (() => {
        const [minE, maxE] = colRange(data.quarterly.map((r) => r.eps))
        const [minR, maxR] = colRange(data.quarterly.map((r) => r.revenues))
        return (
          <>
            <p className={styles.rawTableLabel}>Quarterly</p>
            <table className={styles.rawTable}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th className={highlight.col === 'eps' ? styles.rawThActive : undefined}>
                    EPS
                  </th>
                  <th className={highlight.col === 'revenues' ? styles.rawThActive : undefined}>
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.quarterly.map((r) => {
                  const k = `${r.fiscal_year}-Q${r.fiscal_quarter}`
                  const hit = highlight.qKeys.has(k)
                  return (
                    <tr key={k} className={hit ? styles.rawRowHit : undefined}>
                      <td className={styles.rawPeriod}>
                        Q{r.fiscal_quarter}-{r.fiscal_year}
                      </td>
                      <td
                        className={cn(
                          styles.miniBarCell,
                          hit && highlight.col === 'eps' ? styles.rawCellHighlight : undefined,
                        )}
                      >
                        {fmtEps(r.eps)}
                        <MiniBar value={r.eps} min={minE} max={maxE} />
                      </td>
                      <td
                        className={cn(
                          styles.miniBarCell,
                          hit && highlight.col === 'revenues' ? styles.rawCellHighlight : undefined,
                        )}
                      >
                        {fmtRev(r.revenues)}
                        <MiniBar value={r.revenues} min={minR} max={maxR} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )
      })()}

      {data && data.annual.length > 0 && (() => {
        const [minE, maxE] = colRange(data.annual.map((r) => r.eps))
        const [minR, maxR] = colRange(data.annual.map((r) => r.revenues))
        return (
          <>
            <p className={styles.rawTableLabel} style={{ marginTop: 12 }}>
              Annual
            </p>
            <table className={styles.rawTable}>
              <thead>
                <tr>
                  <th>Year</th>
                  <th className={highlight.col === 'eps' ? styles.rawThActive : undefined}>
                    EPS
                  </th>
                  <th className={highlight.col === 'revenues' ? styles.rawThActive : undefined}>
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.annual.map((r) => {
                  const k = `${r.fiscal_year}`
                  const hit = highlight.aKeys.has(k)
                  return (
                    <tr key={k} className={hit ? styles.rawRowHit : undefined}>
                      <td className={styles.rawPeriod}>FY{r.fiscal_year}</td>
                      <td
                        className={cn(
                          styles.miniBarCell,
                          hit && highlight.col === 'eps' ? styles.rawCellHighlight : undefined,
                        )}
                      >
                        {fmtEps(r.eps)}
                        <MiniBar value={r.eps} min={minE} max={maxE} />
                      </td>
                      <td
                        className={cn(
                          styles.miniBarCell,
                          hit && highlight.col === 'revenues' ? styles.rawCellHighlight : undefined,
                        )}
                      >
                        {fmtRev(r.revenues)}
                        <MiniBar value={r.revenues} min={minR} max={maxR} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )
      })()}

      {data && data.quarterly.length === 0 && data.annual.length === 0 && !loading && (
        <p className={styles.hint}>No income statement data found for this symbol.</p>
      )}
    </section>
  )
}
