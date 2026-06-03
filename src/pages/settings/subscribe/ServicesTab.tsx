import { Activity } from 'lucide-react'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTableNumCell,
} from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import type { StatusResponse } from '@/types/monitor'
import { useLiveMsgAge } from '@/hooks/useLiveMsgAge'
import { useMsgCountRate } from '@/hooks/useMsgCountRate'
import { ingestRedisHealthLamp } from '@/utils/socketIngestLamp'
import {
  formatMsgAgeS,
  fmtConnected,
  fmtNum,
  fmtMsgPerSec,
  fmtProcessInService,
  getEventAccountIds,
  hasSecondaryIbConfigured,
  ingestLampToRowLamp,
} from './subscribeUtils'
import {
  subscribeAgeBadgeBaseClass,
  subscribeAgeBadgeClass,
  subscribeHintClass,
  subscribeMetricTableWrapClass,
  subscribeSectionTitleClass,
  subscribeSummaryCardClass,
  subscribeSummaryKClass,
  subscribeSummaryLineClass,
} from './subscribeUi'

function MetricKvTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className={subscribeMetricTableWrapClass}>
      <DenseDataTable>
        <DenseTableBody>
          {rows.map(row => (
            <DenseTableRow key={row.label}>
              <DenseTableCell className="w-[45%] font-medium text-muted-foreground">
                {row.label}
              </DenseTableCell>
              <DenseTableCell>{row.value}</DenseTableCell>
            </DenseTableRow>
          ))}
        </DenseTableBody>
      </DenseDataTable>
    </div>
  )
}

export function ServicesTab({
  status,
  statusTick,
}: {
  status: StatusResponse | null | undefined
  statusTick: unknown
}) {
  const ib = status?.socket?.ib_ingestor
  const aa = status?.socket?.ib_account_agent
  const ingLamp = ingestRedisHealthLamp('ib_ingestor', status)
  const aaLamp = ingestRedisHealthLamp('ib_account_agent', status)
  const ingestorMsgRate = useMsgCountRate(statusTick, ib?.msg_count)
  const accountAgentMsgRate = useMsgCountRate(statusTick, aa?.msg_count)
  const liveIngAge = useLiveMsgAge(statusTick, ib?.last_msg_age_s)
  const liveAaAge = useLiveMsgAge(statusTick, aa?.last_msg_age_s)

  const { streamHostAccountId, streamSecondaryAccountId } = getEventAccountIds(status)
  const hasSecondaryIb = hasSecondaryIbConfigured(status)
  const aaSecondaryConfigured = aa?.secondary != null && aa.secondary !== undefined
  const hostLabel = streamHostAccountId ? `Host (${streamHostAccountId})` : 'Host'
  const secondaryLabel = streamSecondaryAccountId
    ? `Secondary (${streamSecondaryAccountId})`
    : 'Secondary'

  const ingRowLamp = ingestLampToRowLamp(ingLamp.lamp)
  const aaRowLamp = ingestLampToRowLamp(aaLamp.lamp)

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className={subscribeSectionTitleClass}>Summary</h3>
        <div className="grid gap-3 md:grid-cols-2" role="group" aria-label="IB stream summary">
          <div className={subscribeSummaryCardClass}>
            <div className="flex flex-wrap items-center gap-2">
              <StatusLamp lamp={ingRowLamp} title={ingLamp.title} />
              <span className="font-medium">IB Ingestor</span>
              {liveIngAge != null && (
                <span
                  className={`${subscribeAgeBadgeBaseClass} ${subscribeAgeBadgeClass(liveIngAge)}`}
                >
                  <Activity className="size-3 shrink-0 text-current" strokeWidth={2} aria-hidden />
                  {formatMsgAgeS(liveIngAge)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{ingLamp.title}</p>
            <p className={subscribeSummaryLineClass}>
              <span className={subscribeSummaryKClass}>Last activity</span>
              <span>
                {liveIngAge != null ? formatMsgAgeS(liveIngAge) : formatMsgAgeS(ib?.last_msg_age_s)}
              </span>
            </p>
            <p className={subscribeSummaryLineClass}>
              <span className={subscribeSummaryKClass}>Health msg total</span>
              <span>{fmtNum(ib?.msg_count)}</span>
            </p>
            <p className={subscribeSummaryLineClass}>
              <span className={subscribeSummaryKClass}>Health msg rate</span>
              <span>{fmtMsgPerSec(ingestorMsgRate)}</span>
            </p>
          </div>
          <div className={subscribeSummaryCardClass}>
            <div className="flex flex-wrap items-center gap-2">
              <StatusLamp lamp={aaRowLamp} title={aaLamp.title} />
              <span className="font-medium">IB Account Agent</span>
              {liveAaAge != null && (
                <span
                  className={`${subscribeAgeBadgeBaseClass} ${subscribeAgeBadgeClass(liveAaAge)}`}
                >
                  <Activity className="size-3 shrink-0 text-current" strokeWidth={2} aria-hidden />
                  {formatMsgAgeS(liveAaAge)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{aaLamp.title}</p>
            <p className={subscribeSummaryLineClass}>
              <span className={subscribeSummaryKClass}>Last activity (agent-wide)</span>
              <span>
                {liveAaAge != null ? formatMsgAgeS(liveAaAge) : formatMsgAgeS(aa?.last_msg_age_s)}
              </span>
            </p>
            <p className={subscribeSummaryLineClass}>
              <span className={subscribeSummaryKClass}>Health msg total</span>
              <span>{fmtNum(aa?.msg_count)}</span>
            </p>
            <p className={subscribeSummaryLineClass}>
              <span className={subscribeSummaryKClass}>Health msg rate</span>
              <span>{fmtMsgPerSec(accountAgentMsgRate)}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className={subscribeSectionTitleClass}>IB Ingestor</h3>
        <MetricKvTable
          rows={[
            { label: 'IB API connected', value: fmtConnected(ib?.connected) },
            {
              label: 'Last message age',
              value:
                liveIngAge != null ? formatMsgAgeS(liveIngAge) : formatMsgAgeS(ib?.last_msg_age_s),
            },
            { label: 'Message count (health)', value: fmtNum(ib?.msg_count) },
            { label: 'Reconnects', value: fmtNum(ib?.reconnects) },
            { label: 'Client ID', value: fmtNum(ib?.client_id) },
          ]}
        />
      </section>

      <section className="space-y-2">
        <h3 className={subscribeSectionTitleClass}>IB Account Agent</h3>
        <p className={subscribeHintClass}>
          Agent-wide metrics are a single Redis health hash (combined across accounts). Per-account
          rows show connection slots only.
        </p>
        <MetricKvTable
          rows={[
            { label: 'Process in service', value: fmtProcessInService(aa) },
            {
              label: 'Last message age (agent-wide)',
              value:
                liveAaAge != null ? formatMsgAgeS(liveAaAge) : formatMsgAgeS(aa?.last_msg_age_s),
            },
            { label: 'Message count (combined)', value: fmtNum(aa?.msg_count) },
            { label: 'Reconnects (health)', value: fmtNum(aa?.reconnects) },
          ]}
        />
        <DenseDataTable wrapClassName="mt-3">
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Slot</DenseTableHead>
              <DenseTableHead>IB connected</DenseTableHead>
              <DenseTableHead>Client ID</DenseTableHead>
              <DenseTableHead>Reconnects</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            <DenseTableRow>
              <DenseTableCell className="font-medium">{hostLabel}</DenseTableCell>
              <DenseTableCell>{fmtConnected(aa?.host?.connected ?? aa?.connected)}</DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                {fmtNum(aa?.host?.client_id ?? aa?.client_id)}
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                {fmtNum(aa?.host?.reconnects ?? aa?.reconnects)}
              </DenseTableCell>
            </DenseTableRow>
            <DenseTableRow>
              <DenseTableCell className="font-medium">{secondaryLabel}</DenseTableCell>
              <DenseTableCell>
                {aaSecondaryConfigured
                  ? fmtConnected(aa?.secondary?.connected)
                  : hasSecondaryIb
                    ? '—'
                    : 'Not configured'}
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                {aaSecondaryConfigured ? fmtNum(aa?.secondary?.client_id) : '—'}
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                {aaSecondaryConfigured ? fmtNum(aa?.secondary?.reconnects) : '—'}
              </DenseTableCell>
            </DenseTableRow>
          </DenseTableBody>
        </DenseDataTable>
      </section>
    </div>
  )
}
