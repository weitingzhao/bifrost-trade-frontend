import type { Execution } from '@/types/positions'
import {
  instanceKlineHintClass,
  instanceKlinePanelClass,
  instanceSectionTitleClass,
} from './instanceDetailUi'

interface Props {
  executions: Execution[]
}

/** Section shell until Instance K-line chart is migrated from Legacy. */
export function InstanceKlinePlaceholder({ executions }: Props) {
  const hasSymbol = executions.some((e) => (e.symbol ?? '').trim())
  if (!hasSymbol) return null

  const opt = executions.find((e) => (e.sec_type ?? '').toUpperCase() === 'OPT' && e.symbol)
  const label = opt
    ? `${(opt.symbol ?? '').trim().split(/\s+/)[0]} — option contract`
    : (executions.find((e) => e.symbol)?.symbol ?? '').trim()

  return (
    <section aria-label="K-line chart">
      <h3 className={instanceSectionTitleClass}>K-line Chart</h3>
      <div className={instanceKlinePanelClass}>
        <p className={instanceKlineHintClass}>
          {label ? `${label} — ` : ''}
          Interactive bars chart migration in progress.
        </p>
      </div>
    </section>
  )
}
