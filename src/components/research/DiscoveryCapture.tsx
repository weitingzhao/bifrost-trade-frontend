/**
 * The three verbs a discovery hit is captured with: pin · pool · hypothesis.
 *
 * Ascending commitment, and one implementation. The lane list used to own
 * these; when the Pipeline page folded the four lanes into its census rows
 * (2026-09-21) it took the readings and left the verbs behind, so a hit could
 * be read where it was made and captured nowhere. They live here now, beside
 * the lane table that stamps their origin, and both surfaces render the same
 * component — a hit captured from the census and the same hit captured from a
 * lane must write the same row, including its `origin_page`.
 *
 * A target is the lane plus the hit as its engine published it: the defaults
 * each button pre-fills are the hit's own numbers, so nothing here is
 * computed and nothing is re-derived per surface (§2.1).
 */
import { Pin } from 'lucide-react'
import { fmtNum } from '@/lib/format'
import { IconActionButton } from '@/components/data-display'
import { AddToPoolButton } from '@/components/research/AddToPoolButton'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { cockpitPinStore } from '@/store/cockpitPinStore'
import { LANE_ORIGIN } from './discoveryLanes'
import type {
  EventDiscoveryHit,
  IvExtremeHit,
  SentimentAnomalyHit,
  SepaDiscoveryHit,
} from '@/hooks/useResearchHomeData'

/** A hit and the lane it came out of — the lane decides the origin stamp. */
export type DiscoveryTarget =
  | { lane: 'sepa'; hit: SepaDiscoveryHit }
  | { lane: 'event'; hit: EventDiscoveryHit }
  | { lane: 'iv'; hit: IvExtremeHit }
  | { lane: 'sentiment'; hit: SentimentAnomalyHit }

/**
 * Only SEPA pins today, which is how the lane list drew it: a pin holds a
 * name on the Cockpit, and the Cockpit's hit shapes cover `sepa` alone.
 * Widening it needs a `kind` the store knows, not a button.
 */
function SepaPin({ hit }: { hit: SepaDiscoveryHit }) {
  return (
    <IconActionButton
      title="Pin discovery hit to Cockpit"
      ariaLabel={`Pin ${hit.symbol}`}
      onClick={() =>
        cockpitPinStore.getState().pinHit({
          kind: 'sepa',
          symbol: hit.symbol,
          ts: hit.trade_date,
          detail: { path: hit.path, grade: hit.grade, score: hit.score },
          originPage: LANE_ORIGIN.sepa,
        })
      }
    >
      <Pin className="h-3.5 w-3.5" />
    </IconActionButton>
  )
}

function SepaCapture({ hit }: { hit: SepaDiscoveryHit }) {
  return (
    <>
      <SepaPin hit={hit} />
      <AddToPoolButton
        symbol={hit.symbol}
        source="sepa"
        score={hit.score}
        tags={['sepa', hit.path.toLowerCase(), hit.grade].filter(Boolean)}
        lens_snapshot={{
          sepa_score: hit.score,
          grade: hit.grade,
          path: hit.path,
          stage: hit.stage,
        }}
        source_ref={{ trade_date: hit.trade_date }}
      />
      <SaveAsHypothesisButton
        originPage={LANE_ORIGIN.sepa}
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
    </>
  )
}

function EventCapture({ hit }: { hit: EventDiscoveryHit }) {
  // An event without an affected symbol has nothing to add to the pool — the
  // pool holds names. It is still a hypothesis you can state.
  const symbolPreview = hit.affected_symbols[0]
  return (
    <>
      {symbolPreview ? (
        <AddToPoolButton
          symbol={symbolPreview}
          source="event_radar"
          tags={['event_radar', hit.theme].filter(Boolean) as string[]}
          source_ref={{
            event_id: hit.event_id,
            subject: hit.subject,
            importance: hit.importance,
            direction: hit.direction,
          }}
        />
      ) : null}
      <SaveAsHypothesisButton
        originPage={LANE_ORIGIN.event}
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
    </>
  )
}

function IvCapture({ hit }: { hit: IvExtremeHit }) {
  return (
    <>
      <AddToPoolButton
        symbol={hit.symbol}
        source="iv_extreme"
        score={hit.iv_rank_1y}
        tags={['iv-regime', hit.bucket].filter(Boolean)}
        lens_snapshot={{
          iv_rank_1y: hit.iv_rank_1y,
          iv_current: hit.iv_current,
          bucket: hit.bucket,
        }}
        source_ref={{ trade_date: hit.trade_date }}
      />
      <SaveAsHypothesisButton
        originPage={LANE_ORIGIN.iv}
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
    </>
  )
}

function SentimentCapture({ hit }: { hit: SentimentAnomalyHit }) {
  const tilt = hit.sentiment_score >= 0 ? 'bull-tilt' : 'bear-tilt'
  return (
    <>
      <AddToPoolButton
        symbol={hit.symbol}
        source="order_sentiment"
        score={hit.sentiment_score}
        tags={['sentiment', tilt]}
        lens_snapshot={{
          sentiment_score: hit.sentiment_score,
          pcr_volume: hit.pcr_volume,
          strike_concentration: hit.strike_concentration,
        }}
        source_ref={{ trade_date: hit.trade_date }}
      />
      <SaveAsHypothesisButton
        originPage={LANE_ORIGIN.sentiment}
        defaultTitle={`${hit.symbol} order sentiment anomaly`}
        defaultThesis={`Sentiment score ${fmtNum(hit.sentiment_score, 1)} on ${hit.trade_date}. Investigate flow imbalance.`}
        defaultSymbols={[hit.symbol]}
        defaultTags={['sentiment', tilt]}
        originRef={{
          source: 'order-sentiment',
          symbol: hit.symbol,
          trade_date: hit.trade_date,
          sentiment_score: hit.sentiment_score,
          pcr_volume: hit.pcr_volume,
        }}
      />
    </>
  )
}

/** The verbs for one hit, in ascending order of commitment. */
export function DiscoveryCapture({ target }: { target: DiscoveryTarget }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {target.lane === 'sepa' ? (
        <SepaCapture hit={target.hit} />
      ) : target.lane === 'event' ? (
        <EventCapture hit={target.hit} />
      ) : target.lane === 'iv' ? (
        <IvCapture hit={target.hit} />
      ) : (
        <SentimentCapture hit={target.hit} />
      )}
    </div>
  )
}
