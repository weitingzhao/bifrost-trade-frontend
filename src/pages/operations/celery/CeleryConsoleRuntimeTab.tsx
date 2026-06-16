import type { ConsoleTarget } from './CeleryRuntimeSnapshotSection'
import { CeleryRuntimeSnapshotSection } from './CeleryRuntimeSnapshotSection'
import { CeleryConsoleSection } from './CeleryConsoleSection'

export interface CeleryConsoleRuntimeTabProps {
  consoleTarget: ConsoleTarget
  onSelectConsole: (target: ConsoleTarget) => void
  onScrollToConsole?: () => void
  consoleSectionRef?: React.RefObject<HTMLDivElement | null>
}

export function CeleryConsoleRuntimeTab({
  consoleTarget,
  onSelectConsole,
  onScrollToConsole,
  consoleSectionRef,
}: CeleryConsoleRuntimeTabProps) {
  return (
    <div className="space-y-3">
      <CeleryRuntimeSnapshotSection
        consoleTarget={consoleTarget}
        onSelectConsole={target => {
          onSelectConsole(target)
          if (target !== 'none') onScrollToConsole?.()
        }}
        onScrollToConsole={onScrollToConsole}
      />
      <CeleryConsoleSection
        consoleTarget={consoleTarget}
        onSelectTarget={onSelectConsole}
        sectionRef={consoleSectionRef}
      />
    </div>
  )
}
