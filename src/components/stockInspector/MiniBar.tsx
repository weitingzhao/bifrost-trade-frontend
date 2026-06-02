import styles from './stock-inspector.module.css'

interface Props {
  value: number | null
  min: number
  max: number
}

export function MiniBar({ value, min, max }: Props) {
  if (value == null || !Number.isFinite(value) || max === min) return null
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const color = value >= 0 ? 'rgba(74,222,128,0.28)' : 'rgba(248,113,113,0.28)'
  return (
    <div
      className={styles.miniBar}
      style={{ width: `${pct}%`, background: color }}
    />
  )
}
