import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { triggerResearchCronJob } from '@/api/platformResearch'
import { getOpsToken } from '@/api/ops'
import { useOpsCapabilities } from '@/hooks/useSocketServices'

export interface EmptyHintProps {
  title: string
  hint: string
  to: string
  linkLabel?: string
  icon?: ReactNode
  /** Whitelist trigger id (platform-api L1 CronJob) */
  triggerId?: string
  triggerLabel?: string
  /** Query keys to invalidate after successful trigger */
  invalidateKeys?: readonly (readonly string[])[]
}

export function EmptyHint({
  title,
  hint,
  to,
  linkLabel = 'Open page',
  icon,
  triggerId,
  triggerLabel,
  invalidateKeys,
}: EmptyHintProps) {
  const queryClient = useQueryClient()
  const token = getOpsToken()
  const { data: caps } = useOpsCapabilities(token)
  const canOperate = caps?.capabilities?.can_operate === true

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null)
  const [triggerErr, setTriggerErr] = useState<string | null>(null)

  const showTrigger = triggerId && triggerLabel && canOperate

  async function runTrigger() {
    if (!triggerId) return
    setTriggering(true)
    setTriggerErr(null)
    setTriggerMsg(null)
    try {
      const resp = await triggerResearchCronJob(triggerId)
      setTriggerMsg(`Job ${resp.job_name} started`)
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          await queryClient.invalidateQueries({ queryKey: key as string[] })
        }
      }
      setConfirmOpen(false)
    } catch (e) {
      setTriggerErr(e instanceof Error ? e.message : 'Trigger failed')
    } finally {
      setTriggering(false)
    }
  }

  return (
    <div className="space-y-1.5">
      {icon ? (
        <div className="text-muted-foreground opacity-60">{icon}</div>
      ) : null}
      <p className="text-dense-meta font-medium text-muted-foreground">{title}</p>
      <p className="text-dense-caption text-muted-foreground leading-snug">{hint}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="link" size="sm" className="h-auto p-0 text-dense-meta">
          <Link to={to}>{linkLabel}</Link>
        </Button>
        {showTrigger ? (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-dense-micro"
            onClick={() => setConfirmOpen(true)}
          >
            {triggerLabel}
          </Button>
        ) : null}
      </div>
      {triggerMsg ? <p className="text-dense-caption text-success">{triggerMsg}</p> : null}
      {triggerErr ? <p className="text-dense-caption text-destructive">{triggerErr}</p> : null}

      {showTrigger ? (
        <ConfirmDialog
          open={confirmOpen}
          title={triggerLabel ?? 'Trigger pipeline'}
          message={`This will create a one-off Job from the research CronJob (${triggerId}). Observe-only OLAP — no trade execution.`}
          confirmLabel="Confirm"
          confirming={triggering}
          onConfirm={() => { void runTrigger() }}
          onCancel={() => setConfirmOpen(false)}
        />
      ) : null}
    </div>
  )
}
