import { perfUi } from './performanceUi'

/** A section heading across the page: what the panels below it answer. */
export function PerformanceTier({ label, note }: { label: string; note: string }) {
  return (
    <div className={perfUi.tierRow}>
      <span className={perfUi.tierLabel}>{label}</span>
      <span className={perfUi.tierRule} />
      <span className={perfUi.tierNote}>{note}</span>
    </div>
  )
}
