/**
 * The composition block, now one ring: the base by the role it plays.
 *
 * This used to hold three allocation donuts — asset mix, underlying category,
 * option backing — with their own account switch and filters. They answered how
 * capital is distributed, which is a monthly question, and they opened the page
 * at 455px. The single ring here answers the page's question instead: of what
 * sits under the options, how much is backing a call, a put, free, or unable to
 * back anything. It reads the same derivation the gauges do, so the picture and
 * the grades cannot disagree.
 *
 * Open by default because the Owner reads it; collapsible and remembered.
 */
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupStats,
  CollapsibleGroupTitle,
} from '@/components/data-display'
import styles from './PositionsChartsSection.module.css'
import { BaseRoleCard } from './charts/BaseRoleCard'
import type { BookVsBase } from '@/utils/bookVsBase'

export type OpenTab = 'instance' | 'options' | 'stocks' | 'fixed_income' | 'cash_like'

interface Props {
  /** Controlled and persisted by the page — see usePositionsSections. */
  open: boolean
  onToggle: () => void
  /** The base by role, derived once in usePositionsAlarm. */
  book: BookVsBase
}

export function PositionsChartsSection({ open, onToggle, book }: Props) {
  const total = book.base.reduce((n, l) => n + l.marketValue, 0)
  if (total <= 0) return null

  return (
    <CollapsibleGroup>
      <CollapsibleGroupHeader expanded={open} onToggle={onToggle}>
        <CollapsibleChevron expanded={open} />
        <CollapsibleGroupTitle>Base by role</CollapsibleGroupTitle>
        <CollapsibleGroupStats>
          <span className="text-xs text-muted-foreground">
            What the holdings under the options are doing for them
          </span>
        </CollapsibleGroupStats>
      </CollapsibleGroupHeader>
      {open ? (
        <CollapsibleGroupBody>
          <section className={styles.section} aria-label="Base holdings by role">
            <div className={styles.panel}>
              <BaseRoleCard book={book} />
            </div>
          </section>
        </CollapsibleGroupBody>
      ) : null}
    </CollapsibleGroup>
  )
}
