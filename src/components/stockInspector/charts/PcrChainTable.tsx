import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { SymbolOptionChainExpiryRow } from '@/types/research'
import { fmtChainNum, fmtPcRatio, ratioToneClass } from './pcrChartUtils'
import styles from '../stock-inspector.module.css'

type ChainRowView = SymbolOptionChainExpiryRow & {
  total_vol: number
  total_oi: number
  bar_put_vol_pct: number
  bar_call_vol_pct: number
  bar_total_vol_pct: number
  bar_put_oi_pct: number
  bar_call_oi_pct: number
  bar_total_oi_pct: number
}

function enrichChainRows(rows: SymbolOptionChainExpiryRow[]): ChainRowView[] {
  const base = rows.map((r) => {
    const putVol = Number(r.put_vol) || 0
    const callVol = Number(r.call_vol) || 0
    const putOi = Number(r.put_oi) || 0
    const callOi = Number(r.call_oi) || 0
    const totalVol =
      r.total_vol != null && Number.isFinite(r.total_vol) && r.total_vol > 0
        ? Math.round(r.total_vol)
        : putVol + callVol
    const totalOi =
      r.total_oi != null && Number.isFinite(r.total_oi) && r.total_oi > 0
        ? Math.round(r.total_oi)
        : putOi + callOi
    return {
      ...r,
      put_vol: putVol,
      call_vol: callVol,
      put_oi: putOi,
      call_oi: callOi,
      total_vol: totalVol,
      total_oi: totalOi,
    }
  })
  const maxPutVol = Math.max(1, ...base.map((r) => r.put_vol))
  const maxCallVol = Math.max(1, ...base.map((r) => r.call_vol))
  const maxTotalVol = Math.max(1, ...base.map((r) => r.total_vol))
  const maxPutOi = Math.max(1, ...base.map((r) => r.put_oi))
  const maxCallOi = Math.max(1, ...base.map((r) => r.call_oi))
  const maxTotalOi = Math.max(1, ...base.map((r) => r.total_oi))
  return base.map((r) => ({
    ...r,
    bar_put_vol_pct: Math.round((r.put_vol / maxPutVol) * 1000) / 10,
    bar_call_vol_pct: Math.round((r.call_vol / maxCallVol) * 1000) / 10,
    bar_total_vol_pct: Math.round((r.total_vol / maxTotalVol) * 1000) / 10,
    bar_put_oi_pct: Math.round((r.put_oi / maxPutOi) * 1000) / 10,
    bar_call_oi_pct: Math.round((r.call_oi / maxCallOi) * 1000) / 10,
    bar_total_oi_pct: Math.round((r.total_oi / maxTotalOi) * 1000) / 10,
  }))
}

function ChainHalfCell({
  value,
  pct,
  side,
}: {
  value: number
  pct: number
  side: 'put' | 'call'
}) {
  return (
    <td className={side === 'put' ? styles.chainCellPut : styles.chainCellCall}>
      <span
        className={side === 'put' ? styles.chainBarPut : styles.chainBarCall}
        style={{ width: `${Math.min(100, pct)}%` }}
        aria-hidden
      />
      <span className={side === 'put' ? styles.chainNumPut : styles.chainNumCall}>
        {fmtChainNum(value)}
      </span>
    </td>
  )
}

function ChainTotalCell({
  value,
  pct,
  kind,
}: {
  value: number
  pct: number
  kind: 'vol' | 'oi'
}) {
  const fill = Math.min(100, Math.max(0, pct))
  return (
    <td className={kind === 'vol' ? styles.chainTotalVol : styles.chainTotalOi}>
      <span
        className={kind === 'vol' ? styles.chainBarTotalVol : styles.chainBarTotalOi}
        style={{ width: `${fill}%` }}
        aria-hidden
      />
      <span className={styles.chainNumTotal}>{fmtChainNum(value)}</span>
    </td>
  )
}

interface Props {
  rows: SymbolOptionChainExpiryRow[]
}

export function PcrChainTable({ rows }: Props) {
  const viewRows = useMemo(() => enrichChainRows(rows), [rows])

  if (viewRows.length === 0) {
    return (
      <p className={styles.hint}>
        No option chain snapshots for this symbol. Use Refresh to enqueue a chain sync.
      </p>
    )
  }

  return (
    <div className={styles.chainScroll}>
      <table className={styles.chainTable}>
        <thead>
          <tr>
            <th className={styles.chainThExp}>Expiration</th>
            <th className={styles.chainThDte}>DTE</th>
            <th className={styles.chainThPut}>Put Vol</th>
            <th className={styles.chainThCall}>Call Vol</th>
            <th className={styles.chainThTotal}>Total Vol</th>
            <th className={styles.chainThPc}>P/C Vol</th>
            <th className={styles.chainThPut}>Put OI</th>
            <th className={styles.chainThCall}>Call OI</th>
            <th className={styles.chainThTotal}>Total OI</th>
            <th className={styles.chainThPc}>P/C OI</th>
          </tr>
        </thead>
        <tbody>
          {viewRows.map((r, i) => (
            <tr key={r.expiry} className={i % 2 === 1 ? styles.chainRowAlt : undefined}>
              <td className={styles.chainExp}>{r.expiration_label}</td>
              <td className={styles.chainDte}>{r.dte != null ? r.dte : '—'}</td>
              <ChainHalfCell value={r.put_vol} pct={r.bar_put_vol_pct} side="put" />
              <ChainHalfCell value={r.call_vol} pct={r.bar_call_vol_pct} side="call" />
              <ChainTotalCell value={r.total_vol} pct={r.bar_total_vol_pct} kind="vol" />
              <td
                className={cn(
                  styles.chainPc,
                  ratioToneClass(r.pc_vol, styles.ratioHigh, styles.ratioLow),
                )}
              >
                {fmtPcRatio(r.pc_vol)}
              </td>
              <ChainHalfCell value={r.put_oi} pct={r.bar_put_oi_pct} side="put" />
              <ChainHalfCell value={r.call_oi} pct={r.bar_call_oi_pct} side="call" />
              <ChainTotalCell value={r.total_oi} pct={r.bar_total_oi_pct} kind="oi" />
              <td
                className={cn(
                  styles.chainPc,
                  ratioToneClass(r.pc_oi, styles.ratioHigh, styles.ratioLow),
                )}
              >
                {fmtPcRatio(r.pc_oi)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
