import { ExternalLink } from 'lucide-react'
import type { SepaReadinessSummaryResponse } from '@/types/stockDataReadiness'
import { fmt, fmtRelativeTime } from '@/utils/stockDataReadiness/format'

const OPS_CONSOLE_URL =
  import.meta.env.VITE_OPS_CONSOLE_URL ?? 'http://127.0.0.1:5180'
const PLUGIN_GALLERY_HREF = `${OPS_CONSOLE_URL.replace(/\/$/, '')}/#plugin-gallery`

interface Props {
  summary: SepaReadinessSummaryResponse | null
  vendorFillGap: number | null
}

export function ReadinessMetricsStrip({ summary, vendorFillGap }: Props) {
  const live = summary?.price_readiness_live
  const snap = summary?.snapshot_today

  const metrics = [
    { label: 'Universe', value: fmt(summary?.universe_count), sub: 'v_us_equity_universe' },
    {
      label: 'Unified snapshot rows',
      value: fmt(summary?.stock_unified_snapshot_row_count ?? null),
      sub: `market.stock_snapshot (Plugin)${summary?.stock_unified_snapshot_last_fetched_at ? ` · ${fmtRelativeTime(summary.stock_unified_snapshot_last_fetched_at)}` : ''}`,
    },
    {
      label: 'Daily fill gaps (Step 3)',
      value: fmt(vendorFillGap),
      sub: 'snapshot session_date vs max(stock_daily)',
      accent: vendorFillGap === 0,
    },
    {
      label: 'Price ready (live)',
      value: fmt(live?.price_ready),
      sub: `of ${fmt(live?.total_symbols)} symbols · v_sepa_symbol_price_readiness`,
      accent: true,
    },
    {
      label: 'Snapshot — price ready',
      value: fmt(snap?.price_ready),
      sub: `of ${fmt(snap?.included_in_universe)} included · ${fmt(snap?.rows_total)} total rows`,
      accent: Boolean(snap?.price_ready),
    },
    {
      label: 'Fund cache valid',
      value:
        summary?.fund_cache_view_exists === false
          ? 'View not created'
          : fmt(summary?.fund_cache_valid_count ?? null),
      sub: 'v_sepa_symbol_fund_cache_readiness (optional)',
    },
  ]

  return (
    <div className="space-y-2">
      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-dense-caption text-muted-foreground">
        <span>Pipeline health (workers / freshness) lives in Ops Console Plugin Gallery.</span>
        <a
          href={PLUGIN_GALLERY_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          Open Plugin Gallery
          <ExternalLink className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        </a>
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {metrics.map(m => (
          <div
            key={m.label}
            className="rounded-lg border border-border bg-secondary px-3 py-3 space-y-1"
          >
            <div className="text-dense-caption font-bold uppercase tracking-wider text-muted-foreground">
              {m.label}
            </div>
            <div
              className={
                m.accent
                  ? 'text-2xl font-semibold font-mono tabular-nums text-primary'
                  : 'text-2xl font-semibold font-mono tabular-nums'
              }
            >
              {m.value}
            </div>
            <div className="text-dense-caption text-muted-foreground leading-snug">{m.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
