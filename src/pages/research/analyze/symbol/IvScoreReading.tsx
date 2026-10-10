import type { ExhibitPayload } from '@/api/research/exhibit'
import { FaceKv } from '@/components/research/FaceKv'

import { ivScore } from './ivScore'

/** Research withholds immature scores; local IV history must not recreate them. */
export function IvScoreReading({ exhibit }: { exhibit: ExhibitPayload | undefined }) {
  const rank = ivScore(exhibit, 'iv_rank_1y')
  const percentile = ivScore(exhibit, 'iv_percentile_1y')
  return <>
    <FaceKv label="IV rank" value={rank == null ? '—' : rank.toFixed(0)} />
    <FaceKv label="IV pctl" value={percentile == null ? '—' : percentile.toFixed(0)} />
    {exhibit?.caveats?.map((reason) => (
      <p key={reason} className="col-span-full m-0 text-dense-meta text-muted-foreground">{reason}</p>
    ))}
  </>
}
