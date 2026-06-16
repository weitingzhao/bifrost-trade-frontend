import { AlertTriangle } from 'lucide-react'
import type { SepaReadinessSummaryResponse } from '@/types/stockDataReadiness'
import { ReadinessMetricsStrip } from './ReadinessMetricsStrip'
import { InstrumentTypeDataSupportSection } from './InstrumentTypeDataSupportSection'

export function ReadinessMetricsTabContent({
  summary,
  vendorFillGap,
  snapshotEmpty,
  dataSupportChecked,
  onCheckCoverage,
}: {
  summary: SepaReadinessSummaryResponse | null
  vendorFillGap: number | null
  snapshotEmpty: boolean
  dataSupportChecked: boolean
  onCheckCoverage: () => void
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Readiness metrics
      </h3>
      {snapshotEmpty && (
        <div
          className="flex items-start gap-2 rounded-lg border border-lamp-yellow/40 bg-warning-soft/20 px-3 py-2.5 text-sm text-lamp-yellow"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Snapshot table is empty for today — run Step 10 (Evaluate &amp; publish) to populate it.
          </span>
        </div>
      )}
      <ReadinessMetricsStrip summary={summary} vendorFillGap={vendorFillGap} />
      <InstrumentTypeDataSupportSection
        summary={summary}
        checked={dataSupportChecked}
        onCheckCoverage={onCheckCoverage}
      />
    </div>
  )
}
