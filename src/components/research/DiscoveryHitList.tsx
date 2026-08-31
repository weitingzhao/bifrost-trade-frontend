/**
 * "Today's Discoveries" cluster for Research Home (Wave RS-A4).
 *
 * Renders four columns (SEPA · Events · IV extremes · Sentiment anomalies) as
 * elevated cards with top-3 hits and a "Save as Hypothesis" quick action per
 * row. Empty per-column state is handled locally with EmptyState so a single
 * missing engine does not blank the whole strip.
 */
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowUpRight,
  Pin,
  Radar,
  Sparkles,
  Zap,
} from 'lucide-react'
import { fmtNum } from '@/lib/format'
import { DenseTag, EmptyState, IconActionButton } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { cockpitPinStore } from '@/store/cockpitPinStore'
import type {
  EventDiscoveryHit,
  IvExtremeHit,
  SentimentAnomalyHit,
  SepaDiscoveryHit,
} from '@/hooks/useResearchHomeData'

interface HitColumnProps {
  title: string
  icon: LucideIcon
  hint?: string
  link?: { to: string; label: string }
  isLoading?: boolean
  isEmpty?: boolean
  emptyLabel?: string
  emptyDescription?: string
  children?: React.ReactNode
}

function HitColumn({
  title,
  icon: Icon,
  hint,
  link,
  isLoading,
  isEmpty,
  emptyLabel = 'No hits',
  emptyDescription,
  children,
}: HitColumnProps) {
  return (
    <Card variant="elevated" className="flex h-full flex-col">
      <CardContent className="flex flex-col gap-2 px-3 py-3 h-full">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-dense-label font-semibold">{title}</p>
          </div>
          {link ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-dense-meta"
            >
              <Link to={link.to} aria-label={link.label}>
                {link.label}
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          ) : null}
        </div>
        {hint ? (
          <p className="text-dense-micro text-muted-foreground">{hint}</p>
        ) : null}
        <div className="flex flex-col gap-2 flex-1">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))
            : isEmpty
              ? (
                <EmptyState
                  title={emptyLabel}
                  description={emptyDescription}
                  className="py-4"
                />
              )
              : children}
        </div>
      </CardContent>
    </Card>
  )
}

interface HitRowProps {
  entity: React.ReactNode
  detail: React.ReactNode
  meta?: React.ReactNode
  saveButton: React.ReactNode
  pinButton?: React.ReactNode
}

function HitRow({ entity, detail, meta, saveButton, pinButton }: HitRowProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-2 rounded-md border border-transparent',
        'bg-background/60 px-2 py-1.5 hover:border-border transition-colors',
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-1.5">{entity}</div>
        <div className="text-dense-meta text-muted-foreground line-clamp-2">{detail}</div>
        {meta ? (
          <div className="text-dense-micro text-muted-foreground">{meta}</div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {pinButton}
        {saveButton}
      </div>
    </div>
  )
}

export interface DiscoveryHitListProps {
  sepaHits: SepaDiscoveryHit[]
  eventHits: EventDiscoveryHit[]
  ivExtremes: IvExtremeHit[]
  sentimentAnomalies: SentimentAnomalyHit[]
  sepaTradeDate: string | null
  isLoading: boolean
}

function fmtIv(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const pct = n > 0 && n < 3 ? n * 100 : n
  return `${pct.toFixed(1)}%`
}

function pathVariant(path: SepaDiscoveryHit['path']): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  if (path === 'SETUP') return 'success'
  if (path === 'PIVOT') return 'info'
  if (path === 'WATCH') return 'warning'
  if (path === 'AVOID') return 'danger'
  return 'neutral'
}

function importanceVariant(imp: number): 'danger' | 'warning' | 'neutral' {
  if (imp >= 3) return 'danger'
  if (imp >= 2) return 'warning'
  return 'neutral'
}

function directionVariant(direction: number): 'success' | 'danger' | 'neutral' {
  if (direction > 0) return 'success'
  if (direction < 0) return 'danger'
  return 'neutral'
}

function sentimentVariant(score: number): 'success' | 'danger' | 'neutral' {
  if (score > 0) return 'success'
  if (score < 0) return 'danger'
  return 'neutral'
}

function ivBucketVariant(bucket: IvExtremeHit['bucket']): 'danger' | 'success' | 'warning' | 'neutral' {
  if (bucket === 'high') return 'danger'
  if (bucket === 'low') return 'success'
  if (bucket === 'neutral') return 'warning'
  return 'neutral'
}

export function DiscoveryHitList({
  sepaHits,
  eventHits,
  ivExtremes,
  sentimentAnomalies,
  sepaTradeDate,
  isLoading,
}: DiscoveryHitListProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <HitColumn
        title="SEPA hits"
        icon={Sparkles}
        hint={sepaTradeDate ? `Trade date ${sepaTradeDate}` : 'SETUP / PIVOT short-list'}
        link={{ to: '/research/sepa-daily-core', label: 'View all' }}
        isLoading={isLoading && sepaHits.length === 0}
        isEmpty={!isLoading && sepaHits.length === 0}
        emptyLabel="No SEPA candidates"
        emptyDescription="Waiting for dbt SEPA mart (04:15 UTC)."
      >
        {sepaHits.map((hit) => (
          <HitRow
            key={hit.symbol}
            entity={
              <>
                <DenseTag variant="symbol">{hit.symbol}</DenseTag>
                <DenseTag variant={pathVariant(hit.path)}>{hit.path}</DenseTag>
              </>
            }
            detail={
              <span>
                Grade {hit.grade} · {hit.stage.replace('STAGE_', 'Stage ')}
              </span>
            }
            meta={
              <span className="font-mono tabular-nums">
                Composite {fmtNum(hit.score, 1)}
              </span>
            }
            saveButton={
              <SaveAsHypothesisButton
                originPage="research-home"
                defaultTitle={`${hit.symbol} ${hit.path.toLowerCase()} — SEPA ${hit.grade}`}
                defaultThesis={`SEPA fusion flagged ${hit.symbol} as ${hit.path} on ${hit.trade_date}. Grade ${hit.grade}, composite ${fmtNum(hit.score, 1)}.`}
                defaultSymbols={[hit.symbol]}
                defaultTags={['sepa', hit.path.toLowerCase()]}
                originRef={{
                  source: 'sepa-hit',
                  symbol: hit.symbol,
                  trade_date: hit.trade_date,
                  path: hit.path,
                  stage: hit.stage,
                  grade: hit.grade,
                  score: hit.score,
                }}
              />
            }
            pinButton={
              <IconActionButton
                title="Pin discovery hit to Cockpit"
                ariaLabel={`Pin ${hit.symbol}`}
                onClick={() =>
                  cockpitPinStore.getState().pinHit({
                    kind: 'sepa',
                    symbol: hit.symbol,
                    ts: hit.trade_date,
                    detail: {
                      path: hit.path,
                      grade: hit.grade,
                      score: hit.score,
                    },
                    originPage: '/research/sepa-daily-core',
                  })
                }
              >
                <Pin className="h-3.5 w-3.5" />
              </IconActionButton>
            }
          />
        ))}
      </HitColumn>

      <HitColumn
        title="Events"
        icon={Zap}
        hint="High-importance events flagged today"
        link={{ to: '/research/event-radar', label: 'View all' }}
        isLoading={isLoading && eventHits.length === 0}
        isEmpty={!isLoading && eventHits.length === 0}
        emptyLabel="No events today"
        emptyDescription="Drop CSV / MD into Research-workspace ingest, or wait for scheduled sweep."
      >
        {eventHits.map((hit) => {
          const symbolPreview = hit.affected_symbols[0]
          return (
            <HitRow
              key={hit.event_id}
              entity={
                <>
                  {symbolPreview ? (
                    <DenseTag variant="symbol">{symbolPreview}</DenseTag>
                  ) : null}
                  <DenseTag variant={importanceVariant(hit.importance)}>
                    i{hit.importance || '—'}
                  </DenseTag>
                  <DenseTag variant={directionVariant(hit.direction)}>
                    {hit.direction > 0 ? '↑' : hit.direction < 0 ? '↓' : '→'}
                  </DenseTag>
                </>
              }
              detail={
                <span>{hit.subject || hit.summary || hit.theme || hit.event_id}</span>
              }
              meta={
                hit.theme ? <span>Theme {hit.theme}</span> : null
              }
              saveButton={
                <SaveAsHypothesisButton
                  originPage="research-home"
                  defaultTitle={
                    symbolPreview
                      ? `${symbolPreview} event — ${hit.subject || hit.theme || 'radar'}`
                      : `Event — ${hit.subject || hit.theme || 'radar'}`
                  }
                  defaultThesis={hit.summary || hit.subject || ''}
                  defaultSymbols={hit.affected_symbols}
                  defaultTags={['events', hit.theme].filter(Boolean) as string[]}
                  originRef={{
                    source: 'event-radar',
                    event_id: hit.event_id,
                    batch_id: hit.batch_id,
                    importance: hit.importance,
                    direction: hit.direction,
                  }}
                />
              }
            />
          )
        })}
      </HitColumn>

      <HitColumn
        title="IV extremes"
        icon={Radar}
        hint="Rank distance from 50 across watchlist ∪ holdings"
        link={{ to: '/research/iv-radar', label: 'View all' }}
        isLoading={isLoading && ivExtremes.length === 0}
        isEmpty={!isLoading && ivExtremes.length === 0}
        emptyLabel="No IV data"
        emptyDescription="Volatility engine has not published rows for the current universe yet."
      >
        {ivExtremes.map((hit) => (
          <HitRow
            key={hit.symbol}
            entity={
              <>
                <DenseTag variant="symbol">{hit.symbol}</DenseTag>
                <DenseTag variant={ivBucketVariant(hit.bucket)}>
                  {hit.bucket === 'high'
                    ? 'High'
                    : hit.bucket === 'low'
                      ? 'Low'
                      : hit.bucket === 'neutral'
                        ? 'Mid'
                        : '—'}
                </DenseTag>
              </>
            }
            detail={
              <span>
                Rank {fmtNum(hit.iv_rank_1y, 0)} · ATM IV {fmtIv(hit.iv_current)}
              </span>
            }
            meta={hit.trade_date ? <span>{hit.trade_date}</span> : null}
            saveButton={
              <SaveAsHypothesisButton
                originPage="research-home"
                defaultTitle={`${hit.symbol} IV regime — ${hit.bucket}`}
                defaultThesis={`IV rank ${fmtNum(hit.iv_rank_1y, 0)} places ${hit.symbol} in the ${hit.bucket} bucket. Investigate vol trades.`}
                defaultSymbols={[hit.symbol]}
                defaultTags={['iv-regime', hit.bucket]}
                originRef={{
                  source: 'iv-extreme',
                  symbol: hit.symbol,
                  trade_date: hit.trade_date,
                  bucket: hit.bucket,
                  iv_rank_1y: hit.iv_rank_1y,
                }}
              />
            }
          />
        ))}
      </HitColumn>

      <HitColumn
        title="Sentiment anomalies"
        icon={Activity}
        hint="Largest |sentiment_score| across latest sentiment rows"
        link={{ to: '/research/order-sentiment', label: 'View all' }}
        isLoading={isLoading && sentimentAnomalies.length === 0}
        isEmpty={!isLoading && sentimentAnomalies.length === 0}
        emptyLabel="No sentiment rows"
        emptyDescription="Order sentiment engine has not published anomalies for today."
      >
        {sentimentAnomalies.map((hit) => (
          <HitRow
            key={`${hit.symbol}-${hit.trade_date}`}
            entity={
              <>
                <DenseTag variant="symbol">{hit.symbol}</DenseTag>
                <DenseTag variant={sentimentVariant(hit.sentiment_score)}>
                  {hit.sentiment_score >= 0 ? '+' : ''}
                  {fmtNum(hit.sentiment_score, 1)}
                </DenseTag>
              </>
            }
            detail={
              <span>
                PCR vol {fmtNum(hit.pcr_volume, 2)} · concentration{' '}
                {fmtNum(hit.strike_concentration * 100, 0)}%
              </span>
            }
            meta={
              hit.data_source ? <span>Source {hit.data_source}</span> : null
            }
            saveButton={
              <SaveAsHypothesisButton
                originPage="research-home"
                defaultTitle={`${hit.symbol} order sentiment anomaly`}
                defaultThesis={`Sentiment score ${fmtNum(hit.sentiment_score, 1)} on ${hit.trade_date}. Investigate flow imbalance.`}
                defaultSymbols={[hit.symbol]}
                defaultTags={['sentiment', hit.sentiment_score >= 0 ? 'bull-tilt' : 'bear-tilt']}
                originRef={{
                  source: 'order-sentiment',
                  symbol: hit.symbol,
                  trade_date: hit.trade_date,
                  sentiment_score: hit.sentiment_score,
                  pcr_volume: hit.pcr_volume,
                }}
              />
            }
          />
        ))}
      </HitColumn>
    </div>
  )
}
