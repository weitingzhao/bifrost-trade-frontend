import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ibSlotProbeUnhealthy } from '@/utils/socketIngestLamp'
import { fmtAge, fmtTimestamp } from '@/utils/ingestOpsShared'
import type { StatusResponse } from '@/types/monitor'

export function SocketRedisDetails({ status }: { status: StatusResponse }) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm">Redis Health Details</CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Massive WS</p>
            {status.socket?.massive ? (
              <>
                <div className="text-xs">
                  Connected:{' '}
                  <span className={status.socket.massive.ws_connected ? 'text-green-500' : 'text-red-500'}>
                    {String(status.socket.massive.ws_connected ?? '—')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last msg: {status.socket.massive.last_msg_age_s != null ? fmtAge(status.socket.massive.last_msg_age_s) : '—'}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">No data</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">IB Ingestor</p>
            {status.socket?.ib_ingestor ? (
              <>
                <div className="text-xs">
                  Connected:{' '}
                  <span className={status.socket.ib_ingestor.connected ? 'text-green-500' : 'text-red-500'}>
                    {String(status.socket.ib_ingestor.connected ?? '—')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Probe: {fmtTimestamp(status.socket.ib_ingestor.last_ib_probe_at)}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">No data</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">IB Account Agent</p>
            {status.socket?.ib_account_agent ? (
              <>
                <div className="text-xs">
                  Connected:{' '}
                  <span className={status.socket.ib_account_agent.connected ? 'text-green-500' : 'text-red-500'}>
                    {String(status.socket.ib_account_agent.connected ?? '—')}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last msg: {status.socket.ib_account_agent.last_msg_age_s != null ? fmtAge(status.socket.ib_account_agent.last_msg_age_s) : '—'}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">No data</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">IB Operator</p>
            {status.socket?.ib_operator ? (
              <>
                <div className="text-xs">
                  Connected:{' '}
                  <span className={status.socket.ib_operator.connected ? 'text-green-500' : 'text-red-500'}>
                    {String(status.socket.ib_operator.connected ?? '—')}
                  </span>
                </div>
                {status.socket.ib_operator.host && (
                  <div className="text-xs text-muted-foreground">
                    Host client: {status.socket.ib_operator.host.client_id ?? '—'}
                    {ibSlotProbeUnhealthy(status.socket.ib_operator.host) && (
                      <span className="text-red-400 ml-1">probe stale</span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">No data</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
