import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { WatchlistEodRefreshPreviewItem, WatchlistEodRefreshPreviewResponse } from '@/api/market'
import { fmtDate } from '@/utils/positions'

function fmtTs(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return '—'
  return fmtDate(ts)
}

function fmtDurationSeconds(sec: number | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '—'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m`
}

export function WatchlistEodPreviewDialog({
  open,
  preview,
  backfillIsTest,
  backfillApiIntervalSec,
  running,
  onClose,
  onConfirm,
}: {
  open: boolean
  preview: WatchlistEodRefreshPreviewResponse | null
  backfillIsTest: boolean
  backfillApiIntervalSec: number
  running: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={next => { if (!next && !running) onClose() }}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dry run: EOD Pull</DialogTitle>
          <DialogDescription>
            Review overwrite records, gap range, and IB request chunks before queueing worker jobs.
          </DialogDescription>
        </DialogHeader>
        {preview ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground" role="status">
              {(preview.message || 'Dry run ready') +
                ` Symbols: ${preview.symbols_count ?? 0}, jobs if confirmed: ${preview.queued_jobs_if_confirmed ?? 0}, override_days: ${preview.override_days ?? 1}, API interval: ${preview.api_interval_sec ?? backfillApiIntervalSec}s, mode: ${backfillIsTest ? 'test' : 'live'}.`}
            </p>
            {preview.ready_to_enqueue === false ? (
              <p className="text-destructive" role="alert">
                Monitor is currently stopped; preview cannot be confirmed until monitor is available.
              </p>
            ) : null}
            {(preview.failures || []).length > 0 ? (
              <p className="text-destructive" role="alert">
                Preview failures:{' '}
                {(preview.failures || []).map(f => `${f.symbol} ${f.period}: ${f.error}`).join(' | ')}
              </p>
            ) : null}
            {(preview.items || []).length === 0 ? (
              <p className="text-muted-foreground">No preview items.</p>
            ) : (
              <div className="space-y-3">
                {(preview.items || []).map((item: WatchlistEodRefreshPreviewItem, index) => (
                  <details
                    key={`${item.symbol}-${item.period}-${index}`}
                    className="rounded-md border p-3"
                  >
                    <summary className="cursor-pointer font-medium">
                      {item.symbol} · {item.period} · overwrite{' '}
                      {(item.override_records?.count ?? 0).toLocaleString()} · IB chunks{' '}
                      {(item.ib_request_plan?.length ?? 0).toLocaleString()}
                    </summary>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <strong>Latest stored:</strong> {fmtTs(item.latest_ts)}
                      </div>
                      <div>
                        <strong>Fetch window:</strong> {fmtTs(item.fetch_start_ts)} ~ {fmtTs(item.fetch_end_ts)}
                      </div>
                      <div>
                        <strong>Gap to fill:</strong>{' '}
                        {item.gap_to_fill?.has_gap
                          ? `${fmtTs(item.gap_to_fill?.start_ts)} ~ ${fmtTs(item.gap_to_fill?.end_ts)}`
                          : '—'}
                      </div>
                      <div>
                        <strong>Gap span:</strong> {fmtDurationSeconds(item.gap_to_fill?.span_seconds)}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={running} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              running ||
              preview?.ready_to_enqueue === false ||
              (preview?.items || []).length === 0
            }
            onClick={onConfirm}
          >
            {running ? 'Queuing…' : 'Confirm and Queue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
