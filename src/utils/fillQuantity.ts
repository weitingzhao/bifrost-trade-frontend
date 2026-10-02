/**
 * A fill's size, read whatever sign the API puts on it.
 *
 * From api 0.3.3 (core 0.35.0, TD-30) `quantity` on /executions, the link
 * candidates and `stock_quantity` on option-stock links is signed by one rule:
 * SELL / SLD / S → −|q|, everything else → +|q|. Before that every sell came
 * back positive, and the `tws_raw` scope still sends the stored magnitude.
 * Direction always lives in `side`, so whatever needs only the size reads the
 * magnitude and keeps working against either shape — an older tab, the deploy
 * window, or `tws_raw`.
 */

/**
 * The quantity a fill table or label prints: the magnitude, as every sell read
 * before TD-30 (the direction is in the Side column or the side word beside
 * it). `—` when the API sent none.
 */
export function fillQtyShown(q: unknown): number | '—' {
  return q != null ? Math.abs(Number(q)) : '—'
}
