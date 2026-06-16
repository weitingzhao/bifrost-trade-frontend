import { useCallback, useMemo, useRef, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SegmentControl } from '@/components/data-display'
import type { WorkerProfileInfo } from '@/types/ops'
import { ConfirmDialog } from './ConfirmDialog'
import {
  CELERY_JOB_LIMIT_OPTIONS,
  CELERY_JOB_STATUS_OPTIONS,
  celeryActionMsgClass,
  celeryJobQueuesToolbarClass,
  celeryJobQueuesToolbarLabelClass,
} from './celeryUi'
import type { CeleryStatusFilter } from './celeryTypes'
import { BarsJobsPanel } from './jobQueues/BarsJobsPanel'
import { MassiveJobsPanel } from './jobQueues/MassiveJobsPanel'
import {
  FALLBACK_TABS,
  tabsFromProfiles,
  type ConfirmState,
  type JobQueueTab,
  type StatusFilter,
} from './jobQueues/jobQueueTypes'

export interface CeleryJobQueuesSectionHandle {
  navigateToQueue: (celeryQueue: string) => void
  navigateToQueueWithStatus: (celeryQueue: string, status: StatusFilter) => void
}

export interface CeleryJobQueuesSectionProps {
  profiles?: WorkerProfileInfo[]
  initialQueue?: string | null
  initialStatus?: StatusFilter
}

export function CeleryJobQueuesSection({
  profiles,
  initialQueue = null,
  initialStatus = 'all',
}: CeleryJobQueuesSectionProps) {
  const tabs = useMemo<JobQueueTab[]>(() => {
    if (profiles?.length) {
      const t = tabsFromProfiles(profiles)
      if (t.length > 0) return t
    }
    return FALLBACK_TABS
  }, [profiles])

  const defaultTabId = useMemo(() => {
    if (initialQueue) {
      const found = tabs.find(t => t.celeryQueue === initialQueue)
      if (found) return found.id
    }
    return tabs[0]?.id ?? ''
  }, [tabs, initialQueue])

  const [activeTabId, setActiveTabId] = useState(defaultTabId)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus)
  const [limit, setLimit] = useState<number>(25)
  const [confirm, setConfirm] = useState<(ConfirmState & { confirming: boolean }) | null>(null)
  const [actionMsg, setActionMsg] = useState<{ text: string; isErr: boolean } | null>(null)

  const prevDefaultRef = useRef(defaultTabId)
  if (prevDefaultRef.current !== defaultTabId) {
    prevDefaultRef.current = defaultTabId
    setActiveTabId(defaultTabId)
  }

  const handleConfirm = useCallback((state: ConfirmState) => {
    setConfirm({ ...state, confirming: false })
    setActionMsg(null)
  }, [])

  const handleMsg = useCallback((text: string, isErr: boolean) => {
    setActionMsg({ text, isErr })
  }, [])

  const runConfirm = async () => {
    if (!confirm) return
    const { action } = confirm
    setConfirm(c => c ? { ...c, confirming: true } : null)
    try {
      await action()
    } catch (e) {
      setActionMsg({ text: e instanceof Error ? e.message : 'Operation failed', isErr: true })
    } finally {
      setConfirm(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className={celeryJobQueuesToolbarClass}>
        <div className="flex items-center gap-1.5">
          <span className={celeryJobQueuesToolbarLabelClass}>Status</span>
          <SegmentControl
            size="sm"
            ariaLabel="Filter jobs by status"
            value={statusFilter}
            onChange={v => setStatusFilter(v as CeleryStatusFilter)}
            options={CELERY_JOB_STATUS_OPTIONS}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={celeryJobQueuesToolbarLabelClass}>Last</span>
          <SegmentControl
            size="sm"
            ariaLabel="Limit job rows"
            value={String(limit)}
            onChange={v => setLimit(Number(v))}
            options={CELERY_JOB_LIMIT_OPTIONS}
          />
        </div>
      </div>

      {actionMsg && (
        <p className={celeryActionMsgClass(actionMsg.isErr)} role={actionMsg.isErr ? 'alert' : 'status'}>
          {actionMsg.text}
        </p>
      )}

      <Tabs value={activeTabId} onValueChange={id => { setActiveTabId(id); setActionMsg(null) }}>
        <TabsList className="flex-wrap h-auto gap-1">
          {tabs.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(t => (
          <TabsContent key={t.id} value={t.id} className="mt-3">
            <p className="text-dense-caption font-mono text-muted-foreground mb-2">
              Queue: {t.celeryQueue}
            </p>
            {t.pipeline === 'massive_async' ? (
              <MassiveJobsPanel
                tab={t}
                statusFilter={activeTabId === t.id ? statusFilter : 'all'}
                limit={limit}
                onConfirm={handleConfirm}
                onMsg={handleMsg}
              />
            ) : (
              <BarsJobsPanel
                statusFilter={activeTabId === t.id ? statusFilter : 'all'}
                limit={limit}
                onConfirm={handleConfirm}
                onMsg={handleMsg}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel}
        confirming={confirm?.confirming ?? false}
        onConfirm={() => void runConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
