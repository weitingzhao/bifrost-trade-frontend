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
import type { StatusResponse } from '@/types/monitor'
import { useMsgCountRate } from '@/hooks/useMsgCountRate'
import {
  fmtMsgPerSec,
  fmtNum,
  getSubscribeChannel,
} from './subscribeUtils'
import {
  subscribeDataflowClass,
  subscribeDataflowListClass,
  subscribeHintClass,
  subscribeInlineCodeClass,
  subscribeRedisKeyCellClass,
  subscribeSectionTitleClass,
} from './subscribeUi'

function RedisKeyCell({ label }: { label: string }) {
  if (label === '—') {
    return (
      <DenseTableCell>
        <span className="text-muted-foreground">—</span>
      </DenseTableCell>
    )
  }
  return (
    <DenseTableCell title={label}>
      <code className={subscribeRedisKeyCellClass}>{label}</code>
    </DenseTableCell>
  )
}

export function RedisTab({
  status,
  statusTick,
}: {
  status: StatusResponse | null | undefined
  statusTick: unknown
}) {
  const ib = status?.socket?.ib_ingestor
  const aa = status?.socket?.ib_account_agent
  const subscribeChannel = getSubscribeChannel(status)
  const ingestorMsgRate = useMsgCountRate(statusTick, ib?.msg_count)
  const accountAgentMsgRate = useMsgCountRate(statusTick, aa?.msg_count)
  const tickKeyCount = status?.live_ui?.subscribed_tickers?.length ?? 0
  const quoteTickCountLabel = tickKeyCount > 0 ? String(tickKeyCount) : '—'

  const ingTotal = ib?.msg_count
  const aaTotal = aa?.msg_count
  const combinedTotal =
    ingTotal != null
    && aaTotal != null
    && Number.isFinite(Number(ingTotal))
    && Number.isFinite(Number(aaTotal))
      ? Number(ingTotal) + Number(aaTotal)
      : null
  const combinedRate =
    ingestorMsgRate != null && accountAgentMsgRate != null
      ? ingestorMsgRate + accountAgentMsgRate
      : null

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className={subscribeSectionTitleClass}>Redis paths</h3>
        <p className={subscribeHintClass}>
          Total = health hash <code className={subscribeInlineCodeClass}>msg_count</code> where
          available. Quote notify / tick payload <strong>Count</strong> matches daemon tick keys (
          <code className={subscribeInlineCodeClass}>live_ui.subscribed_tickers</code>). Msg/s is
          estimated from consecutive status polls (often ~5s); idle streams show{' '}
          <code className={subscribeInlineCodeClass}>0/s</code>. Redis key cells show one line
          (hover for full key).
        </p>
        <DenseDataTable tableClassName="min-w-[40rem]">
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Path</DenseTableHead>
              <DenseTableHead>Redis key</DenseTableHead>
              <DenseTableHead align="right">Total</DenseTableHead>
              <DenseTableHead align="right">Count</DenseTableHead>
              <DenseTableHead align="right">Msg/s</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            <DenseTableRow>
              <DenseTableCell className="font-medium">Ingestor health</DenseTableCell>
              <RedisKeyCell label="bifrost:health:ws_ib_ingestor" />
              <DenseTableCell align="right" className={denseTableNumCell}>
                {fmtNum(ingTotal)}
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                —
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                {fmtMsgPerSec(ingestorMsgRate)}
              </DenseTableCell>
            </DenseTableRow>
            <DenseTableRow>
              <DenseTableCell className="font-medium">Quote notify</DenseTableCell>
              <RedisKeyCell label={subscribeChannel} />
              <DenseTableCell align="right" className={denseTableNumCell}>
                {fmtNum(ingTotal)}
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                {quoteTickCountLabel}
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                {fmtMsgPerSec(ingestorMsgRate)}
              </DenseTableCell>
            </DenseTableRow>
            <DenseTableRow>
              <DenseTableCell className="font-medium">Tick payload</DenseTableCell>
              <RedisKeyCell label="ib:ingester:tick:{contract_key}" />
              <DenseTableCell align="right" className={denseTableNumCell}>
                —
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                {quoteTickCountLabel}
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                —
              </DenseTableCell>
            </DenseTableRow>
            <DenseTableRow>
              <DenseTableCell className="font-medium">Account agent health</DenseTableCell>
              <RedisKeyCell label="bifrost:health:ws_ib_account_agent" />
              <DenseTableCell align="right" className={denseTableNumCell}>
                {fmtNum(aaTotal)}
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                —
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                {fmtMsgPerSec(accountAgentMsgRate)}
              </DenseTableCell>
            </DenseTableRow>
            <DenseTableRow>
              <DenseTableCell className="font-medium">Account snapshot</DenseTableCell>
              <RedisKeyCell label="ib:account:snapshot:v1" />
              <DenseTableCell align="right" className={denseTableNumCell}>
                {fmtNum(aaTotal)}
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                —
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                {fmtMsgPerSec(accountAgentMsgRate)}
              </DenseTableCell>
            </DenseTableRow>
            <DenseTableRow>
              <DenseTableCell className="font-medium">Account notify</DenseTableCell>
              <RedisKeyCell label="ib:account:notify" />
              <DenseTableCell align="right" className={denseTableNumCell}>
                {fmtNum(aaTotal)}
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                —
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                {fmtMsgPerSec(accountAgentMsgRate)}
              </DenseTableCell>
            </DenseTableRow>
            <DenseTableRow className="bg-muted/30">
              <DenseTableCell className="font-medium">Combined (health counters)</DenseTableCell>
              <RedisKeyCell label="—" />
              <DenseTableCell align="right" className={denseTableNumCell}>
                {fmtNum(combinedTotal)}
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                —
              </DenseTableCell>
              <DenseTableCell align="right" className={denseTableNumCell}>
                {fmtMsgPerSec(combinedRate)}
              </DenseTableCell>
            </DenseTableRow>
          </DenseTableBody>
        </DenseDataTable>
      </section>

      <section className="space-y-2">
        <h3 className={subscribeSectionTitleClass}>Ingestor data flow (Redis)</h3>
        <details className={subscribeDataflowClass}>
          <summary className="cursor-pointer font-medium text-foreground">Data flow (Redis)</summary>
          <ul className={subscribeDataflowListClass}>
            <li>
              Health hash:{' '}
              <code className={subscribeInlineCodeClass}>bifrost:health:ws_ib_ingestor</code>
            </li>
            <li>
              Quote notify (pub/sub):{' '}
              <code className={subscribeInlineCodeClass}>{subscribeChannel}</code> (from Monitor
              config; default <code className={subscribeInlineCodeClass}>ib:ingester:channel</code>
              )
            </li>
            <li>
              Full tick payload:{' '}
              <code className={subscribeInlineCodeClass}>ib:ingester:tick:{'{contract_key}'}</code>
            </li>
          </ul>
        </details>
      </section>

      <section className="space-y-2">
        <h3 className={subscribeSectionTitleClass}>Account agent data flow (Redis)</h3>
        <details className={subscribeDataflowClass}>
          <summary className="cursor-pointer font-medium text-foreground">Data flow (Redis)</summary>
          <ul className={subscribeDataflowListClass}>
            <li>
              Health hash:{' '}
              <code className={subscribeInlineCodeClass}>bifrost:health:ws_ib_account_agent</code>
            </li>
            <li>
              Account snapshot JSON:{' '}
              <code className={subscribeInlineCodeClass}>ib:account:snapshot:v1</code>
            </li>
            <li>
              Notify channel:{' '}
              <code className={subscribeInlineCodeClass}>ib:account:notify</code>
            </li>
          </ul>
        </details>
      </section>
    </div>
  )
}
