import { readGexLevels } from './gexReading'

/** Chain quotes the Dealer exhibit, including its explicit no-flip reading. */
export function GexLevelChips({ readings }: { readings: Record<string, unknown> }) {
  const r = readGexLevels(readings)
  return <>
    {[
      { label: 'Call wall', value: r.callLabel, cls: 'text-profit' },
      { label: 'Zero γ', value: r.zeroLabel, cls: 'text-warning' },
      { label: 'Put wall', value: r.putLabel, cls: 'text-loss' },
    ].map((c) => (
      <span key={c.label} className="inline-flex items-center gap-1.5 border px-1.5 py-0.5 text-dense-micro mat-tag"
        title={`Dealer reading at ${readings.expiry ?? 'an unavailable expiry'}${r.noFlip ? ' — cumulative net gamma never changes sign' : ''}`}>
        <span className="text-muted-foreground">{c.label}</span>
        <span className={`font-mono ${c.cls}`}>{c.value}</span>
      </span>
    ))}
  </>
}
