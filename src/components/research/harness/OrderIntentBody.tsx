/**
 * An order intent: the shape a hypothesis would be expressed in, drawn as a
 * sketch and never as a ticket.
 *
 * `d10` is BLOCKED and `advisory` true on all four pending on DEV, and the
 * design's ruling (Rev 2026-09-22.7) is that the structure *is* drawn — it is
 * the only draft carrying one — but inside a dashed frame with no inputs, no
 * buttons and no exit to Plans, and with the sentence that says where it stops
 * on the frame itself rather than only in the page header.
 *
 * `risk_hint` and `sizing_hint` are not drawn at all: every field of both is
 * null on all four, and the design's rule for a field this kind *never* carries
 * is to leave it out rather than mark it owed.
 */
import { DenseTag } from '@/components/data-display'
import { DraftRationale } from '@/components/research/harness/DraftRationale'
import { orderIntentView } from '@/lib/harness/orderIntent'
import { readStr as str } from '@/lib/readUnknown'

const TH = 'py-0.5 pr-3 text-left text-dense-micro font-medium text-muted-foreground'
const TD = 'py-0.5 pr-3 font-mono tabular-nums'

/** A leg value the curator did not give. Muted, so the table reads as incomplete. */
function LegCell({ value }: { value: string | number | null }) {
  return value == null || value === '' ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <>{value}</>
  )
}

export function OrderIntentBody({ payload }: { payload: Record<string, unknown> }) {
  const v = orderIntentView(payload)
  const rationale = str(payload.rationale)

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 flex-col gap-1.5 rounded-md border border-dashed border-border px-2.5 py-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-dense-meta font-semibold text-muted-foreground">Structure</span>
          <span className="font-mono text-dense-label">{v.template ?? '—'}</span>
          {v.mismatch ? (
            <DenseTag variant="warning" size="cell">
              legs ≠ template
            </DenseTag>
          ) : null}
          <span className="ml-auto text-dense-micro text-muted-foreground">
            advisory · D10 · stops here, never reaches Trade
          </span>
        </div>

        {v.noLegs ? (
          <p className="m-0 text-muted-foreground">
            No legs — this template is a condition to watch, not a structure.
          </p>
        ) : (
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[26rem] border-collapse text-dense-meta">
              <thead>
                <tr>
                  <th className={TH}>Side</th>
                  <th className={TH}>Right</th>
                  <th className={TH}>Strike</th>
                  <th className={TH}>Symbol</th>
                  <th className={TH}>Expiry</th>
                  <th className={TH}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {v.legs.map((l, i) => (
                  <tr key={`${l.symbol}-${l.right}-${l.strike}-${i}`} className="border-t border-border/40">
                    <td className={TD}>
                      <LegCell value={l.side} />
                    </td>
                    <td className={TD}>
                      <LegCell value={l.right} />
                    </td>
                    <td className={TD}>
                      <LegCell value={l.strike} />
                    </td>
                    <td className={TD}>
                      <span className="font-mono font-bold text-entity-symbol">
                        <LegCell value={l.symbol} />
                      </span>
                    </td>
                    <td className={TD}>
                      <LegCell value={l.expiry} />
                    </td>
                    <td className={TD}>
                      <LegCell value={l.qty} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {v.mismatchNote ? (
          <p className="m-0 text-dense-micro leading-normal text-warning text-pretty">{v.mismatchNote}</p>
        ) : null}
      </div>

      {rationale ? <DraftRationale text={rationale} /> : null}
    </div>
  )
}
