export function ReferenceIndexSymbolCell({
  symbol,
  reference,
}: {
  symbol: string
  reference?: { symbol?: string; label?: string; polygon_ticker?: string } | null
}) {
  const px = (reference?.polygon_ticker || '').trim()
  const label = (reference?.label || '').trim()
  const titleParts: string[] = []
  if (label && label !== symbol) titleParts.push(label)
  if (px) titleParts.push(`Massive/Polygon ticker: ${px}`)
  const title = titleParts.length > 0 ? titleParts.join(' · ') : undefined
  return (
    <span className="inline-flex flex-wrap items-baseline gap-0.5">
      <strong className="font-semibold" title={title}>
        {symbol}
      </strong>
      {px ? (
        <span className="text-xs text-muted-foreground" title="Aggregate ticker used for Massive/Polygon sync">
          {' · '}
          {px}
        </span>
      ) : null}
    </span>
  )
}
