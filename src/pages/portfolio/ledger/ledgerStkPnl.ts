import styles from './ledgerStyles'

export function ledgerStkPnlClass(v: number): string {
  if (!Number.isFinite(v) || Math.abs(v) < 0.005) return styles.pnlZero
  return v > 0 ? styles.pnlPositive : styles.pnlNegative
}
