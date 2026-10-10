/** Daily Research levels only: exposure_guards drops a non-crossing flip and
 * empty-side walls; exhibit_lenses derives regime from total_net_gex's sign.
 * An omitted field, failed read or exposure-free row is not a no-flip reading.
 */
export function readGexLevels(row: Record<string, unknown> | null | undefined) {
  const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null
  const net = finite(row?.total_net_gex)
  const zero = finite(row?.zero_gamma)
  const call = finite(row?.major_call_wall)
  const put = finite(row?.major_put_wall)
  const measured = net != null && (net !== 0 || call != null || put != null || zero != null)
  const noFlip = measured && row?.zero_gamma === null
  const longGamma = measured ? net >= 0 : null
  return {
    noFlip,
    longGamma,
    regime: longGamma == null ? null : longGamma ? 'positive' : 'negative',
    zeroLabel: zero != null ? String(zero) : noFlip ? 'no flip' : '—',
    callLabel: call != null ? String(call) : measured && row?.major_call_wall === null ? 'no call exposure' : '—',
    putLabel: put != null ? String(put) : measured && row?.major_put_wall === null ? 'no put exposure' : '—',
  }
}

/** A missing newest session is unknown; missing sessions break continuity. */
export function gexRegimeStreak(rows: readonly { longGamma: boolean | null }[]) {
  const longGamma = rows[rows.length - 1]?.longGamma ?? null
  if (longGamma == null) return { streak: null, longGamma }
  let streak = 0
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].longGamma !== longGamma) break
    streak++
  }
  return { streak, longGamma }
}
