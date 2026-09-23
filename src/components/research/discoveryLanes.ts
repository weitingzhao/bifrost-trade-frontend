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
 * Nothing renders `DiscoveryHitList` today: the Pipeline page folded the four
 * lanes into its census rows on 2026-09-21 and took the readings without the
 * verbs, so this table is correct and dormant until the Owner rules on where
 * the lanes' pin / pool / save actions live.
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
   * Order sentiment — options order flow, read on Symbol's flow face (the
   * `order-sentiment` token already lands there). It was stamped Narrative
   * until 2026-09-23 on the census's mislabel; Narrative reads filing text,
   * and none of the 57 hypotheses on DEV that day carried its route.
   */
  sentiment: '/research/symbol',
  /** Events belong to Home › Alerts, off the Pipeline bench but still an origin. */
  event: '/research/event-radar',
} as const
