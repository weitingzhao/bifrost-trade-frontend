import { useMemo } from 'react'
import type { FundRawData } from '@/types/research'
import styles from './stock-inspector.module.css'
import { fmtEps, fmtRev } from './stockInspectorUtils'

function colRange(vals: (number | null)[]): [number, number] {
  const ns = vals.filter((v): v is number => v != null && Number.isFinite(v))
  if (ns.length === 0) return [0, 0]
  return [Math.min(...ns), Math.max(...ns)]
}

function MiniBar({ value, min, max }: { value: number | null; min: number; max: number }) {
  if (value == null || !Number.isFinite(value) || max === min) return null
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const color = value >= 0 ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'
  return <div className={styles.miniBar} style={{ width: `${pct}%`, background: color }} />
}

interface Props {
  loading: boolean
  data: FundRawData | undefined
  activeCond: string | null
}

export function FundRawDataSection({ loading, data, activeCond }: Props) {
  const highlight = useMemo(() => {
    const qKeys = new Set<string>()
    const aKeys = new Set<string>()
    let col: 'eps' | 'revenues' | null = null
    if (!activeCond || !data?.quarterly?.length) return { qKeys, aKeys, col }

    const qRows = data.quarterly
    const qKey = (r: { fiscal_year: number; fiscal_quarter: number }) =>
      `${r.fiscal_year}-Q${r.fiscal_quarter}`

    if (['eps_q2q_ge_25pct', 'rev_q2q_ge_25pct', 'eps_acc_2q', 'rev_acc_2q'].includes(activeCond)) {
      if (qRows[0]) {
        qKeys.add(qKey(qRows[0]))
        col = activeCond.includes('rev') ? 'revenues' : 'eps'
      }
    }
    return { qKeys, aKeys, col }
  }, [activeCond, data])

  if (!loading && (!data || (data.quarterly.length === 0 && data.annual.length === 0))) {
    return null
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionTitle}>
        <span>Source Data</span>
        {activeCond && highlight.col && (
          <span className={styles.sectionTitleAsOf}>
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
            <p className={cnLabel()}>Quarterly</p>
            <table className={styles.rawTable}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>EPS</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.quarterly.map((r) => {
                  const k = `${r.fiscal_year}-Q${r.fiscal_quarter}`
                  const hit = highlight.qKeys.has(k)
                  return (
                    <tr key={k} className={hit ? styles.rawRowHit : undefined}>
                      <td>Q{r.fiscal_quarter}-{r.fiscal_year}</td>
                      <td className={styles.miniBarCell}>
                        {fmtEps(r.eps)}
                        <MiniBar value={r.eps} min={minE} max={maxE} />
                      </td>
                      <td className={styles.miniBarCell}>
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
    </section>
  )
}

function cnLabel() {
  return 'text-[10px] uppercase tracking-wide text-muted-foreground mb-1'
}
