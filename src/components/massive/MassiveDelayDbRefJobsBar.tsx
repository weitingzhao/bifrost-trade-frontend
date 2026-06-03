import { Button } from '@/components/ui/button'
import { useMassiveRefJobSession } from '@/components/massive/massiveRefJobContext'

export function MassiveDelayDbRefJobsBar() {
  const { openJobsSheet, activeJobCount } = useMassiveRefJobSession()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={openJobsSheet}>
        Jobs
      </Button>
      {activeJobCount > 0 ? (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
          {activeJobCount} active
        </span>
      ) : null}
    </div>
  )
}
