import type { InstanceAllGroup, OpenOptionPosition } from '@/types/positions'

function contractSortKey(pos: OpenOptionPosition): [string, string, number] {
  return [(pos.symbol ?? '').toUpperCase(), pos.expiry ?? '', pos.strike ?? 0]
}

/** Default sort within each strategy group: symbol → expiry → strike (Legacy default). */
export function sortInstanceGroupOptions(groups: InstanceAllGroup[]): InstanceAllGroup[] {
  return groups.map((g) => ({
    ...g,
    options: [...g.options].sort((a, b) => {
      const [as, ae, ast] = contractSortKey(a)
      const [bs, be, bst] = contractSortKey(b)
      const c1 = as.localeCompare(bs)
      if (c1 !== 0) return c1
      const c2 = ae.localeCompare(be)
      if (c2 !== 0) return c2
      return ast - bst
    }),
  }))
}
