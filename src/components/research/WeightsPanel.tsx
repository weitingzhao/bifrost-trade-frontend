/**
 * The composite's weights, and the sliders that move them.
 *
 * *"One composite; the weights are the model and they are yours to move"* is
 * the sentence both ratings prototypes lead with, and this is the control it
 * promises: preset tabs across the header, one slider per lens, and the sum
 * beside the preset's name. A ranked list whose ranking you cannot move is a
 * number to take on faith.
 *
 * It is shared because both pages draw the identical panel over different
 * lenses — the Stocks page had it inline first, and Vol ratings needed the
 * same header, the same 0–50 step-5 slider and the same "moved off the model"
 * line. Two copies is two chances for one page to let you move a weight the
 * other page silently ignores.
 *
 * **What it does not know** is how the composite is computed: it reports the
 * weights you set and nothing else. Each page owns its own composite so that
 * the arithmetic sits beside the fields it reads, which is also what lets each
 * page check its own sum against the server's score.
 */
import { SectionPanel } from '@/components/layout'
import { SegmentControl } from '@/components/data-display'
import { fmtWeight, presetOf, weightSum, type WeightLens, type WeightPreset } from './weightModel'

export function WeightsPanel({
  lenses,
  presets,
  weights,
  onWeights,
  /** The preset that is the server's own — the one the page opens agreeing with. */
  serverPresetId,
  /** The line under the sliders when the weights are nobody's preset. */
  customNote,
}: {
  lenses: readonly WeightLens[]
  presets: readonly WeightPreset[]
  weights: Record<string, number>
  onWeights: (next: Record<string, number>) => void
  serverPresetId: string
  customNote: string
}) {
  const preset = presetOf(presets, lenses, weights)
  const sum = weightSum(lenses, weights)
  return (
    <SectionPanel
      cap="Composite"
      title="Weights"
      note={
        preset === serverPresetId
          ? 'on the server’s own — this list agrees with its score'
          : `moved off the model · Σ ${fmtWeight(sum)}`
      }
    >
      <div className="px-3 py-2">
        <SegmentControl
          size="xs"
          ariaLabel="Weight preset"
          value={preset ?? 'custom'}
          onChange={(id) => {
            const p = presets.find((x) => x.id === id)
            if (p) onWeights({ ...p.weights })
          }}
          options={[
            ...presets.map((p) => ({ value: p.id, label: p.label, title: p.note })),
            ...(preset == null ? [{ value: 'custom', label: 'Custom' }] : []),
          ]}
        />
      </div>
      <div className="flex flex-col gap-2 px-3 pb-2">
        {lenses.map((lens) => (
          <label
            key={lens.key}
            className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-2"
          >
            <span className="text-dense-label">{lens.label}</span>
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={weights[lens.key] ?? 0}
              onChange={(e) => onWeights({ ...weights, [lens.key]: Number(e.target.value) })}
              className="h-3.5 w-full accent-[var(--color-profit)]"
              aria-label={`${lens.label} weight`}
            />
            <span className="text-right font-mono text-dense-label tabular-nums">
              {fmtWeight(weights[lens.key] ?? 0)}
            </span>
          </label>
        ))}
        <p className="text-dense-caption leading-relaxed text-muted-foreground">
          {presets.find((p) => p.id === preset)?.note ?? customNote}
        </p>
      </div>
    </SectionPanel>
  )
}
