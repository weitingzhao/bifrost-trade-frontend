import { useRef, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CeleryPageHeader } from './celery/CeleryPageHeader'
import { CeleryTopSection } from './celery/CeleryTopSection'
import { CeleryJobQueuesSection } from './celery/CeleryJobQueuesSection'
import { CeleryWorkerInstancesSection } from './celery/CeleryWorkerInstancesSection'
import { CelerySidePanel } from './celery/CelerySidePanel'
import { CelerySectionCard } from './celery/CelerySectionCard'
import { CeleryTabPlaceholder } from './celery/CeleryTabPlaceholder'
import {
  CELERY_MAIN_TABS,
  isCeleryMainTab,
  type CeleryMainTab,
  type CeleryStatusFilter,
} from './celery/celeryTypes'
import {
  CELERY_MAIN_TAB_TRIGGER,
  CELERY_MAIN_TABS_LIST,
  CELERY_SPLIT_GRID,
} from './celery/celeryLayoutClasses'
import { useWorkerProfiles } from '@/hooks/useOpsData'

const JOB_QUEUES_TOOLTIP =
  'PostgreSQL job rows per worker profile queue. Filter by status, trim old done rows, retry or delete in bulk. Click a queue name in Queue Summary above to jump here with filters.'

const WORKER_INSTANCES_TOOLTIP =
  'Running systemd/Celery worker units on this Ops host. Instance IDs are profile_key-sequence (Cycle). Queue summary: click a queue cell to filter this list. Profile bubbles: Add Instance / ALL with Add all, Reset all, Remove all. Per row: Recreate / Remove.'

export default function CeleryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab: CeleryMainTab = isCeleryMainTab(tabParam) ? tabParam : 'queues_instances'

  const [mainTab, setMainTab] = useState<CeleryMainTab>(initialTab)
  const [jobQueueTarget, setJobQueueTarget] = useState<{
    queue: string
    status?: CeleryStatusFilter
    seq: number
  } | null>(null)
  const [queueFilter, setQueueFilter] = useState<string | null>(null)
  const jobQueuesSectionRef = useRef<HTMLDivElement>(null)
  const { data: profilesData } = useWorkerProfiles()

  useEffect(() => {
    if (isCeleryMainTab(tabParam) && tabParam !== mainTab) {
      setMainTab(tabParam)
    }
  }, [tabParam, mainTab])

  const handleTabChange = useCallback(
    (value: string) => {
      if (!isCeleryMainTab(value)) return
      setMainTab(value)
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev)
          if (value === 'queues_instances') next.delete('tab')
          else next.set('tab', value)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  function navigateToQueue(queue: string, status?: CeleryStatusFilter) {
    setJobQueueTarget(prev => ({ queue, status, seq: (prev?.seq ?? 0) + 1 }))
    setQueueFilter(queue)
    handleTabChange('queues_instances')
    setTimeout(() => {
      jobQueuesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  return (
    <TooltipProvider>
      <PageShell className="space-y-6">
        <CeleryPageHeader />

        <CeleryTopSection onNavigateToQueue={navigateToQueue} />

        <Tabs value={mainTab} onValueChange={handleTabChange}>
          <TabsList className={CELERY_MAIN_TABS_LIST}>
            {CELERY_MAIN_TABS.map(t => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className={CELERY_MAIN_TAB_TRIGGER}
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="queues_instances" className="space-y-6 mt-4">
            <div ref={jobQueuesSectionRef}>
              <CelerySectionCard title="Job Queues" tooltip={JOB_QUEUES_TOOLTIP}>
                <CeleryJobQueuesSection
                  key={
                    jobQueueTarget
                      ? `${jobQueueTarget.queue}-${jobQueueTarget.seq}`
                      : 'default'
                  }
                  profiles={profilesData?.profiles}
                  initialQueue={jobQueueTarget?.queue ?? null}
                  initialStatus={jobQueueTarget?.status ?? 'all'}
                />
              </CelerySectionCard>
            </div>

            <div className={CELERY_SPLIT_GRID}>
              <CelerySectionCard
                title="Worker Instances"
                tooltip={WORKER_INSTANCES_TOOLTIP}
              >
                <CeleryWorkerInstancesSection
                  queueFilter={queueFilter}
                  onClearQueueFilter={() => setQueueFilter(null)}
                />
              </CelerySectionCard>

              <CelerySidePanel />
            </div>
          </TabsContent>

          <TabsContent value="console_runtime" className="mt-4">
            <CeleryTabPlaceholder
              title="Console & Runtime"
              description="Live broker and worker log streams plus Celery inspect runtime snapshot."
              plannedFeatures={[
                'Broker SSE log console and per-worker Redis log subscriptions',
                'Runtime snapshot cards with relative heartbeat and Dev/Prod pills',
                'Click a worker card to open its console stream',
              ]}
            />
          </TabsContent>

          <TabsContent value="support_tasks" className="mt-4">
            <CeleryTabPlaceholder
              title="Support Tasks"
              description="Queue kind/mode matrix and registered Celery task registry from Ops capabilities."
              plannedFeatures={[
                'Sortable run_massive_job matrix with queue kind and mode filters',
                'Registered Celery tasks table (task name, queue, notes)',
                'Navigate from Queue Summary filter icon into this matrix',
              ]}
            />
          </TabsContent>

          <TabsContent value="scheduled_jobs" className="mt-4">
            <CeleryTabPlaceholder
              title="Scheduled Jobs"
              description="Beat task names from Ops capabilities (distinct from the cron schedule in Queues sidebar)."
              plannedFeatures={[
                'Capabilities beat_tasks table with task path and notes',
                'Cross-reference with Research API cron entries in the sidebar',
              ]}
            />
          </TabsContent>
        </Tabs>
      </PageShell>
    </TooltipProvider>
  )
}
