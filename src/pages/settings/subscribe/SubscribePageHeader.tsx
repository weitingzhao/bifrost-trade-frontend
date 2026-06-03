import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Activity, Unplug } from 'lucide-react'
import { PageHeader } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { postReleaseTickerSubscriptions } from '@/api/monitor'
import { useInvalidateStatus } from '@/hooks/useMonitorStatus'
import { useLiveMsgAge } from '@/hooks/useLiveMsgAge'
import type { StatusResponse } from '@/types/monitor'
import {
  formatMsgAgeS,
  rollupSubscribeHeaderLamp,
} from './subscribeUtils'
import {
  subscribeAgeBadgeBaseClass,
  subscribeAgeBadgeClass,
  subscribeHintClass,
  subscribeInlineCodeClass,
} from './subscribeUi'

const SUBSCRIBE_PAGE_INFO =
  'Market and account-domain data reach the stack via Redis: IB Ingestor (quotes notify + tick hashes) and IB Account Agent (snapshot + notify).'

export function SubscribePageHeader({
  status,
  statusTick,
}: {
  status: StatusResponse | null | undefined
  statusTick: unknown
}) {
  const invalidateStatus = useInvalidateStatus()
  const hb = status?.daemon?.heartbeat
  const ib = status?.socket?.ib_ingestor
  const aa = status?.socket?.ib_account_agent

  const header = rollupSubscribeHeaderLamp(status)
  const liveIngAge = useLiveMsgAge(statusTick, ib?.last_msg_age_s)
  const liveAaAge = useLiveMsgAge(statusTick, aa?.last_msg_age_s)

  const [syncMsg, setSyncMsg] = useState<{ text: string; isErr: boolean }>({ text: '', isErr: false })
  const msgClearRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (msgClearRef.current != null) clearTimeout(msgClearRef.current)
    }
  }, [])

  const releaseMutation = useMutation({
    mutationFn: postReleaseTickerSubscriptions,
    onSuccess: async res => {
      if (res.ok) {
        setSyncMsg({ text: 'Released; restoring on next heartbeat', isErr: false })
        if (msgClearRef.current != null) clearTimeout(msgClearRef.current)
        msgClearRef.current = setTimeout(() => setSyncMsg({ text: '', isErr: false }), 5000)
        setTimeout(() => invalidateStatus(), 1500)
      } else if (res.error) {
        setSyncMsg({ text: res.error, isErr: true })
      }
    },
    onError: err => {
      setSyncMsg({
        text: err instanceof Error ? err.message : 'Release failed',
        isErr: true,
      })
    },
  })

  const onRelease = useCallback(() => {
    releaseMutation.mutate()
  }, [releaseMutation])

  const headerLampColor =
    header.lamp === 'none' ? 'gray' : header.lamp

  return (
    <div className="space-y-3">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusLamp lamp={headerLampColor} title={header.title} />
            IB Event Subscribe
            <InfoTooltip text={SUBSCRIBE_PAGE_INFO} />
            <span className="inline-flex flex-wrap items-center gap-2" aria-label="Stream last activity">
              {liveIngAge != null && (
                <span
                  className={`${subscribeAgeBadgeBaseClass} ${subscribeAgeBadgeClass(liveIngAge)}`}
                  title={`IB Ingestor last message: ${formatMsgAgeS(liveIngAge)}`}
                >
                  <Activity className="size-3 shrink-0 text-current" strokeWidth={2} aria-hidden />
                  <span>Ingestor</span>
                  <span className="font-medium">{formatMsgAgeS(liveIngAge)}</span>
                </span>
              )}
              {liveAaAge != null && (
                <span
                  className={`${subscribeAgeBadgeBaseClass} ${subscribeAgeBadgeClass(liveAaAge)}`}
                  title={`IB Account Agent last message: ${formatMsgAgeS(liveAaAge)}`}
                >
                  <Activity className="size-3 shrink-0 text-current" strokeWidth={2} aria-hidden />
                  <span>Account</span>
                  <span className="font-medium">{formatMsgAgeS(liveAaAge)}</span>
                </span>
              )}
            </span>
          </span>
        }
        titleSize="large"
        actions={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            title="Release all ticker subscriptions; daemon restores on next heartbeat"
            aria-label="Release ticker subscriptions"
            disabled={releaseMutation.isPending || !hb?.daemon_alive}
            onClick={onRelease}
          >
            <Unplug className="h-4 w-4" aria-hidden />
          </Button>
        }
      />

      <p className={subscribeHintClass}>
        Redis stream health from Monitor GET /status (
        <code className={subscribeInlineCodeClass}>socket</code>). Ticker release is a daemon control
        action (requires engine running).{' '}
        <Link to="/settings/socket" className="text-primary underline-offset-4 hover:underline">
          Open Socket services
        </Link>
      </p>

      {syncMsg.text ? (
        <Alert variant={syncMsg.isErr ? 'destructive' : 'default'}>
          <AlertDescription>{syncMsg.text}</AlertDescription>
        </Alert>
      ) : null}

      {hb?.last_control_message ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{hb.last_control_message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
