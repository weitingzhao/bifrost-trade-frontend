import { LogConsole } from '@/components/log/LogConsole'
import { SOCKET_LOG_SOURCES, clearAllSocketServiceLogs } from '@/api/logs'

const SOURCE_TAG: Record<string, string> = {
  massive_ws: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  ib_operator: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  ib_ingestor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  ib_account_agent: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
}

export function SocketLogConsole() {
  return (
    <section className="border-t border-border pt-6 mt-6" aria-labelledby="socket-logs-heading">
      <h2 id="socket-logs-heading" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-2">
        Logs
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Merged console output from all socket ingest processes. Toggle sources to filter; clear removes all four Redis streams on the Monitor host.
      </p>
      <LogConsole
        sources={SOCKET_LOG_SOURCES}
        sourceTags={SOURCE_TAG}
        onClearServer={clearAllSocketServiceLogs}
        emptyMessage="No log lines yet. Start the corresponding ingest scripts."
        clearTitle="Clear displayed log and all four Redis streams"
      />
    </section>
  )
}
