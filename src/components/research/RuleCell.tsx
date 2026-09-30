/**
 * The Rule cell (Vol ratings, Stock screen): which active opportunity is
 * registered on a name, from `strategy_opportunity`'s own symbol list.
 *
 * One active opportunity is named; more than one says how many, because the
 * column is narrow and a name that fits three rules is a name to open rather
 * than to read in a cell. What it does not say is that the opportunity's
 * entry conditions are met — nothing evaluates those per name.
 */
import { Link } from 'react-router-dom'
import type { VolRule } from '@/lib/research/volRatingsModel'

export function RuleCell({ rules }: { rules: readonly VolRule[] | undefined }) {
  if (!rules || rules.length === 0) {
    return (
      <span className="text-muted-foreground" title="No active opportunity is registered on this name.">
        none active
      </span>
    )
  }
  return (
    <Link
      to={`/trade/rules?pick=opportunity:${rules[0].id}`}
      onClick={(e) => e.stopPropagation()}
      className="truncate hover:underline"
      title={`${rules.map((r) => r.name).join(' · ')} — opens its chain on Rules`}
    >
      {rules[0].name}
      {rules.length > 1 ? <span className="text-muted-foreground"> +{rules.length - 1}</span> : null}
    </Link>
  )
}
