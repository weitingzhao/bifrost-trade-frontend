import styles from './TradeLedgerPage.module.css'

const CLASS_MAP: Record<string, string> = {
  flex_trades: styles.sourceFlex,
  flex: styles.sourceFlex,
  tws_event: styles.sourceTws,
  tws_client: styles.sourceTws,
  journal_closed: styles.sourceJournal,
  manual: styles.sourceManual,
}

const LABEL_MAP: Record<string, string> = {
  flex_trades: 'flex',
  flex: 'flex',
  tws_event: 'tws',
  tws_client: 'tws-client',
  journal_closed: 'journal',
  manual: 'manual',
}

export function ExecSourceBadge({ source }: { source?: string | null }) {
  const s = (source ?? '').trim()
  if (!s) return <span className={styles.optMuted}>—</span>
  const cls = CLASS_MAP[s] ?? styles.sourceUnknown
  const label = LABEL_MAP[s] ?? s
  const title = s === 'journal_closed' ? 'Manual accounting adjustment (journal entry)' : s
  return (
    <span className={`${styles.sourceBadge} ${cls}`} title={title}>
      {label}
    </span>
  )
}
