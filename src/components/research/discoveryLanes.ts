/**
 * The station each lane came out of.
 *
 * A hit is the product of the engine behind a page, and saving one records
 * *where it came from* — so the stamp is that page, not this list. Every
 * button here used to write `research-home`, the page the list is rendered
 * on, which is why the Pipeline census read zero in its **Moved on** column
 * for every station: the join was sound and the stamp was wrong. Measured on
 * DEV 2026-09-21, 8 of the 53 hypotheses on file came through these buttons
 * and carry `research-home`; the other 45 are the loop's and Copilot's own
 * saves, which name their path rather than a station and are right to.
 *
 * Routes rather than tokens, because the census keys by route and three of
 * its rows are pages that have no token. `originDest` takes an address
 * directly, so the Hypothesis Board still links a card to where it was born.
 */
export const LANE_ORIGIN = {
  /** SEPA scores — read on Stock ratings, which is `sepa_daily_core`'s page. */
  sepa: '/research/ratings/stocks',
  /** IV extremes — Vol ratings, over `option_snapshot_aggregates`. */
  iv: '/research/scan',
  /**
   * Order sentiment — Narrative, over `sentiment_row`. The one lane whose
   * page the design has and this side has not built: the stamp is still
   * provenance, and `originDest` answers null so no card offers a dead link.
   */
  sentiment: '/research/narrative',
  /** Events belong to Home › Alerts, off the Pipeline bench but still an origin. */
  event: '/research/event-radar',
} as const
