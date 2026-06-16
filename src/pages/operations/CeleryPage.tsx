import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageShell } from '@/components/layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CeleryPageHeader } from './celery/CeleryPageHeader'
import { CeleryTopSection } from './celery/CeleryTopSection'
import { CeleryJobQueuesSection } from './celery/CeleryJobQueuesSection'
import { CeleryWorkerInstancesSection } from './celery/CeleryWorkerInstancesSection'
import { CelerySidePanel } from './celery/CelerySidePanel'
import { CelerySectionCard } from './celery/CelerySectionCard'
import { CeleryConsoleRuntimeTab } from './celery/CeleryConsoleRuntimeTab'
import { CelerySupportTasksSection } from './celery/supportTasks/CelerySupportTasksSection'
import { CeleryScheduledJobsSection } from './celery/CeleryScheduledJobsSection'
import { CeleryOpsProvider } from './celery/CeleryOpsProvider'
import { useCeleryOps } from './celery/useCeleryOps'
import type { ConsoleTarget } from './celery/CeleryRuntimeSnapshotSection'
import {
  CELERY_MAIN_TABS,
  isCeleryMainTab,
  type CeleryMainTab,
  type CeleryStatusFilter,
} from './celery/celeryTypes'
import {
  CELERY_FLASH_ENTER,
  CELERY_MAIN_TAB_TRIGGER,
  CELERY_MAIN_TABS_LIST,
  CELERY_SPLIT_GRID,
} from './celery/celeryUi'
import {
  applyCeleryUrlPatch,
  legacyHashToCelerySearchParams,
  parseCelerySearchParams,
} from './celery/celeryUrlSync'
import { resolveConsoleTargetForQueue } from './celery/celeryNavigation'
import { useWorkerProfiles, useOpsWorkers } from '@/hooks/useOpsData'
import { cn } from '@/lib/utils'

const JOB_QUEUES_TOOLTIP =
  'PostgreSQL job rows per worker profile queue. Filter by status, trim old done rows, retry or delete in bulk. Click a queue name in Queue Summary above to jump here with filters.'

const WORKER_INSTANCES_TOOLTIP =
  'Running systemd/Celery worker units on this Ops host. Instance IDs are profile_key-sequence (Cycle). Queue summary: click a queue cell to filter this list. Profile bubbles: Add Instance / ALL with Add all, Reset all, Remove all. Per row: Recreate / Remove.'

function CeleryPageContent() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlState = parseCelerySearchParams(searchParams)
  const mainTab = urlState.tab
  const brokerQueueFilter = urlState.brokerQueue

  const { flash } = useCeleryOps()
  const { data: workersData } = useOpsWorkers()
  const workers = useMemo(() => workersData?.workers ?? [], [workersData?.workers])
  const { data: profilesData } = useWorkerProfiles()

  const [jobQueueTarget, setJobQueueTarget] = useState<{
    queue: string
    status?: CeleryStatusFilter
    seq: number
  } | null>(null)
  const [queueFilter, setQueueFilter] = useState<string | null>(null)
  const [consoleTarget, setConsoleTarget] = useState<ConsoleTarget>('none')

  const jobQueuesSectionRef = useRef<HTMLDivElement>(null)
  const consoleSectionRef = useRef<HTMLDivElement>(null)
  const urlSyncedRef = useRef<string>('')

  // Legacy hash → search params (one-time)
  useEffect(() => {
    const converted = legacyHashToCelerySearchParams(window.location.hash)
    if (!converted) return
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev)
        converted.forEach((v, k) => next.set(k, v))
        return next
      },
      { replace: true },
    )
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  }, [setSearchParams])

  // URL → local state
  useEffect(() => {
    const key = searchParams.toString()
    if (urlSyncedRef.current === key) return
    urlSyncedRef.current = key

    const parsed = parseCelerySearchParams(searchParams)

    if (parsed.queue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync URL deep link to job queue target
      setQueueFilter(parsed.queue)
      setJobQueueTarget(prev => ({
        queue: parsed.queue!,
        status: parsed.status ?? 'all',
        seq: (prev?.seq ?? 0) + 1,
      }))
    }

    if (parsed.console) {
      setConsoleTarget(parsed.console)
    }
  }, [searchParams])

  const handleTabChange = useCallback(
    (value: string) => {
      if (!isCeleryMainTab(value)) return
      setSearchParams(
        prev => applyCeleryUrlPatch(prev, { tab: value as CeleryMainTab }),
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const scrollToConsole = useCallback(() => {
    requestAnimationFrame(() => {
      consoleSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const navigateToQueue = useCallback(
    (queue: string, status?: CeleryStatusFilter) => {
      setJobQueueTarget(prev => ({ queue, status, seq: (prev?.seq ?? 0) + 1 }))
      setQueueFilter(queue)
      setSearchParams(
        prev =>
          applyCeleryUrlPatch(prev, {
            tab: 'queues_instances',
            queue,
            status: status ?? null,
          }),
        { replace: true },
      )
      setTimeout(() => {
        jobQueuesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    },
    [setSearchParams],
  )

  const navigateToConsoleForQueue = useCallback(
    (queue: string) => {
      const target = resolveConsoleTargetForQueue(queue, workers)
      setConsoleTarget(target)
      setSearchParams(
        prev =>
          applyCeleryUrlPatch(prev, {
            tab: 'console_runtime',
            console: target,
          }),
        { replace: true },
      )
      scrollToConsole()
    },
    [workers, setSearchParams, scrollToConsole],
  )

  const toggleSupportTasksFilter = useCallback(
    (brokerKey: string) => {
      const q = brokerKey.trim()
      if (!q) return
      setSearchParams(
        prev => {
          const cur = prev.get('broker_queue')
          const nextFilter = cur === q ? null : q
          return applyCeleryUrlPatch(prev, {
            tab: 'support_tasks',
            brokerQueue: nextFilter,
          })
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const clearBrokerQueueFilter = useCallback(() => {
    setSearchParams(prev => applyCeleryUrlPatch(prev, { brokerQueue: null }), { replace: true })
  }, [setSearchParams])

  const clearWorkerQueueFilter = useCallback(() => {
    setQueueFilter(null)
    setSearchParams(
      prev => applyCeleryUrlPatch(prev, { queue: null, status: null }),
      { replace: true },
    )
  }, [setSearchParams])

  const selectConsole = useCallback(
    (target: ConsoleTarget) => {
      setConsoleTarget(target)
      if (target !== 'none') {
        setSearchParams(
          prev =>
            applyCeleryUrlPatch(prev, {
              tab: 'console_runtime',
              console: target,
            }),
          { replace: true },
        )
      } else {
        setSearchParams(prev => applyCeleryUrlPatch(prev, { console: 'none' }), { replace: true })
      }
    },
    [setSearchParams],
  )

  return (
    <TooltipProvider>
        <PageShell padding="default" className="space-y-3">
        <CeleryPageHeader />

        {flash && (
          <Alert
            variant={flash.isErr ? 'destructive' : 'default'}
            role={flash.isErr ? 'alert' : 'status'}
            className={cn(
              CELERY_FLASH_ENTER,
              !flash.isErr && 'border-green-500/40 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
            )}
          >
            <AlertDescription>{flash.text}</AlertDescription>
          </Alert>
        )}

        <CeleryTopSection
          onNavigateToQueue={navigateToQueue}
          onNavigateQueueConsole={navigateToConsoleForQueue}
          onToggleSupportTasksFilter={toggleSupportTasksFilter}
          onClearWorkerQueueFilter={clearWorkerQueueFilter}
          queueFilter={queueFilter}
          activeSupportTasksFilterKey={brokerQueueFilter}
        />

        <Tabs value={mainTab} onValueChange={handleTabChange}>
          <TabsList className={CELERY_MAIN_TABS_LIST}>
            {CELERY_MAIN_TABS.map(t => (
              <TabsTrigger key={t.value} value={t.value} className={CELERY_MAIN_TAB_TRIGGER}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="queues_instances" className="space-y-3 mt-3">
            <div ref={jobQueuesSectionRef}>
              <CelerySectionCard title="Job Queues" tooltip={JOB_QUEUES_TOOLTIP}>
                <CeleryJobQueuesSection
                  key={
                    jobQueueTarget ? `${jobQueueTarget.queue}-${jobQueueTarget.seq}` : 'default'
                  }
                  profiles={profilesData?.profiles}
                  initialQueue={jobQueueTarget?.queue ?? urlState.queue}
                  initialStatus={jobQueueTarget?.status ?? urlState.status ?? 'all'}
                />
              </CelerySectionCard>
            </div>

            <div className={CELERY_SPLIT_GRID}>
              <CelerySectionCard title="Worker Instances" tooltip={WORKER_INSTANCES_TOOLTIP}>
                <CeleryWorkerInstancesSection
                  queueFilter={queueFilter}
                  onClearQueueFilter={clearWorkerQueueFilter}
                />
              </CelerySectionCard>
              <CelerySidePanel />
            </div>
          </TabsContent>

          <TabsContent value="console_runtime" className="mt-3">
            <CeleryConsoleRuntimeTab
              consoleTarget={consoleTarget}
              onSelectConsole={selectConsole}
              onScrollToConsole={scrollToConsole}
              consoleSectionRef={consoleSectionRef}
            />
          </TabsContent>

          <TabsContent value="support_tasks" className="mt-3">
            <CelerySupportTasksSection
              mainTab={mainTab}
              brokerQueueFilter={brokerQueueFilter}
              onClearBrokerFilter={clearBrokerQueueFilter}
            />
          </TabsContent>

          <TabsContent value="scheduled_jobs" className="mt-3">
            <CeleryScheduledJobsSection mainTab={mainTab} />
          </TabsContent>
        </Tabs>
      </PageShell>
    </TooltipProvider>
  )
}

export default function CeleryPage() {
  return (
    <CeleryOpsProvider>
      <CeleryPageContent />
    </CeleryOpsProvider>
  )
}
