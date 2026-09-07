import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import {
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupTitle,
  DenseTag,
  EmptyState,
} from '@/components/data-display'
import { SettlementBadges } from '@/components/data-display/SettlementBadges'
import { EmptyHint } from '@/components/research/EmptyHint'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { VerdictStrip } from '@/components/research/VerdictStrip'
import { settlementFineGrain } from '@/lib/researchSettlement'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import {
  fetchDailyBriefSynth,
  type DailyBriefLensCard,
  type DailyBriefLensKey,
  type SepaScoreRow,
} from '@/api/researchEngine'
import { useDailyVerdict } from '@/hooks/useDailyVerdict'
import { useResearchContext } from '@/hooks/useResearchContext'
import { CARD_TITLES, sourceLamps } from '@/lib/dailyBrief'
import { BriefLensCard } from './dailyBrief/BriefLensCard'

interface EmptyCopy {
  title: string
  hint: string
  triggerId?: string
  triggerLabel?: string
  linkLabel?: string
}

/** What the card says when its exhibit has no reading, and which CronJob fills it. */
const EMPTY: Record<DailyBriefLensKey | 'events', EmptyCopy> = {
  terrain: {
    title: 'No terrain row',
    hint: 'Terrain is produced by the forecast engine; intraday snapshots every 15min.',
    triggerId: 'terrain-forecast',
    triggerLabel: 'Trigger terrain forecast',
  },
  forecast: {
    title: 'No settled forecast session',
    hint: 'Forecast sessions settle after the close; the path record needs settled sessions.',
    triggerId: 'terrain-forecast',
    triggerLabel: 'Trigger forecast',
  },
  gex: {
    title: 'No GEX levels',
    hint: 'Try SPY / QQQ — SPX OI may not be backfilled yet.',
    triggerId: 'gex-intraday',
    triggerLabel: 'Trigger GEX intraday',
    linkLabel: 'Open Dealer Levels',
  },
  opex: {
    title: 'No OpEx pin reading',
    hint: 'Max pain needs the OpEx cycle engine (option OI by strike).',
  },
  iv: {
    title: 'No IV percentile',
    hint: 'IV percentile requires the volatility engine run.',
    triggerId: 'iv-percentile',
    triggerLabel: 'Trigger IV percentile',
  },
  vrp: { title: 'No VRP row', hint: 'VRP needs the volatility engine (ATM IV vs realised vol).' },
  skew: { title: 'No SVI fit', hint: 'Skew needs the vol-surface engine (daily SVI fit).' },
  term_slope: { title: 'No term structure', hint: 'Needs two fitted expiries from the vol-surface engine.' },
  sepa: {
    title: 'No SEPA candidates',
    hint: 'Wait for dbt SEPA mart (04:15 UTC).',
    triggerId: 'dbt-sepa',
    triggerLabel: 'Trigger dbt SEPA',
  },
  momentum: {
    title: 'No momentum rows',
    hint: 'Momentum CronJob runs daily at 05:00 UTC.',
    triggerId: 'momentum',
    triggerLabel: 'Trigger momentum',
  },
  events: {
    title: 'No events',
    hint: 'Run event radar CronJob or drop CSV into the ingest folder.',
    triggerId: 'event-radar',
    triggerLabel: 'Trigger event radar',
  },
  sentiment: { title: 'No sentiment row', hint: 'Options tape ingest may not be enabled.' },
}

function GroupTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
  )
}

export default function DailyBriefPage() {
  const { symbol, dateInput, selectedDate, apiDate } = useResearchContext()
  const [contextOpen, setContextOpen] = useState(true)
  const sym = symbol

  const synthQ = useQuery({
    queryKey: ['daily-brief-synth', sym, apiDate],
    queryFn: () => fetchDailyBriefSynth(sym, apiDate),
    enabled: sym.length > 0,
    refetchInterval: 60_000,
  })
  const synth = synthQ.data
  const { verdict, withContext } = useDailyVerdict(synth, sym, dateInput)
  const invalidateKeys = [['daily-brief-synth', sym, apiDate ?? '']] as const
  const cards = synth?.cards
  const anyPresent = cards ? Object.values(cards).some((c) => c.present) : false

  const empty = (key: DailyBriefLensKey | 'events', to: string) => {
    const copy = EMPTY[key]
    return (
      <EmptyHint
        title={copy.title}
        hint={copy.hint}
        to={withContext(to)}
        linkLabel={copy.linkLabel}
        triggerId={copy.triggerId}
        triggerLabel={copy.triggerLabel}
        invalidateKeys={invalidateKeys}
      />
    )
  }

  /** A lens card: the exhibit's verdict, or the empty hint when the reader has nothing. */
  const lensCard = (
    key: DailyBriefLensKey,
    emphasis: 'primary' | 'default' = 'default',
    extra?: (card: DailyBriefLensCard) => ReactNode,
    hasOwnData?: (card: DailyBriefLensCard) => boolean,
  ) => {
    if (!cards) return null
    const card = cards[key]
    const filled = hasOwnData ? hasOwnData(card) : card.present
    return (
      <BriefLensCard key={key} title={CARD_TITLES[key]} card={card} openTo={withContext(card.to)} emphasis={emphasis}>
        {filled ? extra?.(card) : empty(key, card.to)}
      </BriefLensCard>
    )
  }

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Daily Brief"
        actions={
          <div className="flex items-center gap-1.5">
            <AskCopilotButton
              originPage="daily-brief"
              originLabel="Daily Brief"
              symbol={sym}
              date={dateInput || undefined}
              snapshot={compactSnapshot({
                narrative: verdict?.narrative.text,
                risk: verdict?.risk.text,
                opportunity: verdict?.opportunity.text,
              })}
              suggestedPrompt={`Based on today's daily brief for ${sym}, highlight the signals I should act on.`}
            />
            <SaveAsHypothesisButton
              originPage="daily-brief"
              defaultTitle={`${sym} daily brief`}
              defaultSymbols={sym ? [sym] : []}
              originRef={{ symbol: sym, date: selectedDate }}
            />
          </div>
        }
      />

      <ResearchContextBar />

      {synthQ.isError ? <QueryErrorAlert error={synthQ.error} onRetry={() => void synthQ.refetch()} /> : null}

      {synthQ.isLoading || !synth || !verdict || !cards ? (
        synthQ.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-xl" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
        ) : null
      ) : (
        <>
          <VerdictStrip
            narrative={verdict.narrative}
            risk={verdict.risk}
            opportunity={verdict.opportunity}
            actionHint={verdict.actionHint}
            sourceLamps={sourceLamps(synth)}
            footnote="Every card is the exhibit its hub view reads — same numbers, same verdict. *Order Sentiment is an OI proxy without a tape; it carries no verdict."
          />

          <div>
            <GroupTitle>Scenario & dealer levels</GroupTitle>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {lensCard('terrain', 'primary')}
              {lensCard('forecast', 'primary', (card) =>
                card.settlement ? (
                  <SettlementBadges
                    pathHit={card.settlement.path_hit}
                    pathHitCount={card.settlement.path_hit_count}
                    pathTotal={card.settlement.path_total}
                    closeMissPct={card.settlement.close_miss_pct}
                    {...settlementFineGrain(card.settlement)}
                  />
                ) : (
                  <p className="text-dense-meta text-muted-foreground">No settlement yet</p>
                ),
              )}
              {lensCard('gex', 'primary')}
              {lensCard('opex')}
            </div>
          </div>

          <div>
            <GroupTitle>Vol regime</GroupTitle>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {lensCard('iv')}
              {lensCard('vrp')}
              {lensCard('skew')}
              {lensCard('term_slope')}
            </div>
          </div>

          <CollapsibleGroup variant="card">
            <CollapsibleGroupHeader expanded={contextOpen} onToggle={() => setContextOpen((o) => !o)}>
              <CollapsibleGroupTitle>Context — screeners, events, flow</CollapsibleGroupTitle>
            </CollapsibleGroupHeader>
            {contextOpen ? (
              <CollapsibleGroupBody>
                <div className="grid grid-cols-1 gap-3 p-3 pt-0 md:grid-cols-2 xl:grid-cols-4">
                  {lensCard(
                    'sepa',
                    'default',
                    (card) => (
                      <div className="flex flex-wrap gap-1">
                        {(card.candidates ?? []).map((r: SepaScoreRow) => (
                          <DenseTag key={r.symbol} variant="symbol">
                            {r.symbol}
                          </DenseTag>
                        ))}
                      </div>
                    ),
                    (card) => (card.candidates ?? []).length > 0,
                  )}
                  {lensCard(
                    'momentum',
                    'default',
                    (card) => (
                      <p className="text-dense-meta text-muted-foreground">
                        {card.count ?? 0} scored · sample {(card.sample_symbols ?? []).join(', ') || '—'}
                      </p>
                    ),
                    (card) => (card.count ?? 0) > 0,
                  )}
                  <BriefLensCard title={CARD_TITLES.events} card={cards.events} openTo={withContext(cards.events.to)}>
                    {cards.events.rows.length > 0 ? (
                      <ul className="space-y-1">
                        {cards.events.rows.slice(0, 4).map((e) => (
                          <li
                            key={e.event_id}
                            className="truncate text-dense-meta text-muted-foreground"
                            title={e.subject || e.event_summary}
                          >
                            <span className="mr-1 font-mono text-dense-micro">i{e.importance ?? '—'}</span>
                            {e.subject || e.event_summary || e.theme || e.event_id}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      empty('events', cards.events.to)
                    )}
                  </BriefLensCard>
                  {lensCard('sentiment')}
                </div>
              </CollapsibleGroupBody>
            ) : null}
          </CollapsibleGroup>

          {!anyPresent ? (
            <EmptyState
              icon={<ClipboardList />}
              title="No brief data"
              description={`No Research engine rows for ${sym} on ${selectedDate}. Empty lamps are honest — no fabricated signals.`}
            />
          ) : null}
        </>
      )}

      <p className="text-dense-caption text-muted-foreground">
        Daily Brief reads the same exhibits as the Analyze hubs — observe only (D10). Not investment advice.
      </p>
    </PageShell>
  )
}
