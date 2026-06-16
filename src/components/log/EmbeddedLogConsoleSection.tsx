import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { denseTable } from '@/components/data-display'
import { LogConsole, type LogConsoleProps } from './LogConsole'

export interface EmbeddedLogConsoleSectionProps extends Omit<LogConsoleProps, 'showAdvancedFilters'> {
  headingId: string
  title: string
  tooltip: string
  /** Level filter + search row (same as global LogPanel / Architecture tab). */
  showAdvancedFilters?: boolean
}

/** Page-embedded log console — shared shell for Settings → Socket, API Health Architecture, etc. */
export function EmbeddedLogConsoleSection({
  headingId,
  title,
  tooltip,
  showAdvancedFilters = true,
  ...logConsoleProps
}: EmbeddedLogConsoleSectionProps) {
  return (
    <section className="space-y-3" aria-labelledby={headingId}>
      <h3 id={headingId} className={denseTable.sectionTitle}>
        {title}
        <InfoTooltip text={tooltip} />
      </h3>
      <LogConsole showAdvancedFilters={showAdvancedFilters} {...logConsoleProps} />
    </section>
  )
}
