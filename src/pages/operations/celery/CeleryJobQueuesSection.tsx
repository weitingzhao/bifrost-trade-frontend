import { EmptyState } from '@/components/data-display'

/** Trade Celery (stocks_ib bars backfill) retired — stock OHLC ingest is Market Data Plugin ops_jobs. */
export function CeleryJobQueuesSection() {
  return (
    <EmptyState
      title="Celery job queues retired"
      description="IB stock bars backfill and stocks_ib Celery were removed. Use Settings → Data Coverage (Stock) or Ops Console Market Data Plugin for Polygon enqueue and Cron schedules."
    />
  )
}
