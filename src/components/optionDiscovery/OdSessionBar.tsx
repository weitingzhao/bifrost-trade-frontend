import type { MassiveDailyChecklistDims, MassiveStatusResponse } from '@/types/optionDiscovery'
import { DiscoveryHint } from './DiscoveryHint'
import { DiscoveryIconButton } from './DiscoveryIconButton'
import { DiscoverySection } from './DiscoverySection'

function formatDimShort(_key: string, block: { status?: string } | undefined): string {
  if (!block?.status) return '—'
  const st = block.status.toLowerCase()
  if (st === 'complete') return 'OK'
  if (st === 'missing') return 'missing'
  if (st === 'partial') return 'partial'
  if (st === 'degraded') return 'degraded'
  return block.status
}

function formatSnapshotTime(block: { last_ts?: string; status?: string } | undefined): string {
  if (!block?.last_ts) return formatDimShort('daily-snapshot', block)
  const m = /T(\d{2}:\d{2})/.exec(block.last_ts)
  return m ? `OK ${m[1]}` : 'OK'
}

export interface OdSessionBarProps {
  massiveStatus: MassiveStatusResponse | null
  selectedSymbol: string
  dailyDims: MassiveDailyChecklistDims | null
  dailyDimsDate: string | null
  dailyDimsLoading: boolean
  onOpenMassiveFeed?: () => void
}

export function OdSessionBar({
  massiveStatus,
  selectedSymbol,
  dailyDims,
  dailyDimsDate,
  dailyDimsLoading,
  onOpenMassiveFeed,
}: OdSessionBarProps) {
  return (
    <DiscoverySection first className="flex flex-col overflow-visible" aria-label="Session">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="option-discovery-conditions-head" className="text-base font-medium">
          Chain
        </h3>
        {massiveStatus?.configured && selectedSymbol.trim() ? (
          <div
            className="flex flex-wrap items-center gap-2 min-w-0"
            role="status"
          >
            {dailyDimsLoading ? (
              <DiscoveryHint as="span" className="mt-0">
                Loading daily data status…
              </DiscoveryHint>
            ) : dailyDims ? (
              <>
                <span className="text-xs font-medium text-foreground">
                  Daily data ({dailyDimsDate ?? '—'})
                </span>
                <DiscoveryHint as="span" className="mt-0 font-mono">
                  {`${selectedSymbol.trim().toUpperCase()} · Snapshot: ${formatSnapshotTime(dailyDims['daily-snapshot'])} · OI: ${formatDimShort('daily-oi', dailyDims['daily-oi'])} · Max pain: ${formatDimShort('daily-max-pain', dailyDims['daily-max-pain'])} · Corporate: ${formatDimShort('daily-corporate', dailyDims['daily-corporate'])} · WS: ${formatDimShort('daily-ws-alive', dailyDims['daily-ws-alive'])}`}
                </DiscoveryHint>
                {onOpenMassiveFeed && (
                  <DiscoveryIconButton
                    className="od-daily-data-open-btn"
                    onClick={onOpenMassiveFeed}
                    title="Open daily data status in Settings"
                    aria-label="Open daily data status"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="3" y1="15" x2="21" y2="15" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                      <line x1="15" y1="3" x2="15" y2="21" />
                    </svg>
                  </DiscoveryIconButton>
                )}
              </>
            ) : (
              <DiscoveryHint as="span" className="mt-0">
                Daily data status unavailable.
              </DiscoveryHint>
            )}
          </div>
        ) : null}
      </div>
    </DiscoverySection>
  )
}
