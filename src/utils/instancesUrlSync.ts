import type {
  InstanceListFilterValues,
  SinceFilter,
  StatusFilter,
  RightFilter,
} from '@/components/strategy/InstanceListFilters'
import type { DetailViewMode } from '@/components/strategy/InstanceListToolbar'

export type InstancesUrlState = {
  account: string
  opportunityId: number | ''
  instanceId: number | ''
  filters: InstanceListFilterValues
  detailViewMode: DetailViewMode
}

const SINCE_VALUES: SinceFilter[] = ['', '1m', 'q', 'half', '1y', 'ytd']
const STATUS_VALUES: StatusFilter[] = ['', 'open', 'closed']
const RIGHT_VALUES: RightFilter[] = ['', 'C', 'P']

function parsePositiveInt(raw: string | null): number | '' {
  if (!raw?.trim()) return ''
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : ''
}

function parseSince(raw: string | null): SinceFilter {
  if (raw == null) return 'q' // default matches previous page default
  return SINCE_VALUES.includes(raw as SinceFilter) ? (raw as SinceFilter) : 'q'
}

function parseStatus(raw: string | null): StatusFilter {
  if (!raw) return ''
  return STATUS_VALUES.includes(raw as StatusFilter) ? (raw as StatusFilter) : ''
}

function parseRight(raw: string | null): RightFilter {
  if (!raw) return ''
  const u = raw.toUpperCase()
  return RIGHT_VALUES.includes(u as RightFilter) ? (u as RightFilter) : ''
}

function parseView(raw: string | null): DetailViewMode {
  return raw === 'multi' ? 'multi' : 'accordion'
}

/** Read Instances list filters from the URL (survives detail open remount). */
export function parseInstancesSearchParams(searchParams: URLSearchParams): InstancesUrlState {
  return {
    account: searchParams.get('account')?.trim() ?? '',
    opportunityId: parsePositiveInt(searchParams.get('opp')),
    instanceId: parsePositiveInt(searchParams.get('instance')),
    filters: {
      status: parseStatus(searchParams.get('status')),
      structure: searchParams.get('structure')?.trim() ?? '',
      symbol: searchParams.get('symbol')?.trim().toUpperCase() ?? '',
      right: parseRight(searchParams.get('right')),
      expiry: searchParams.get('expiry')?.trim() ?? '',
      since: parseSince(searchParams.get('since')),
    },
    detailViewMode: parseView(searchParams.get('view')),
  }
}

export type InstancesUrlPatch = Partial<{
  account: string
  opportunityId: number | ''
  instanceId: number | ''
  status: StatusFilter
  structure: string
  symbol: string
  right: RightFilter
  expiry: string
  since: SinceFilter
  detailViewMode: DetailViewMode
  /** Replace all list filters at once (Clear). */
  filters: InstanceListFilterValues
}>

function setOrDelete(next: URLSearchParams, key: string, value: string | null | undefined) {
  const v = value?.trim()
  if (v) next.set(key, v)
  else next.delete(key)
}

export function applyInstancesUrlPatch(
  prev: URLSearchParams,
  patch: InstancesUrlPatch,
): URLSearchParams {
  const next = new URLSearchParams(prev)

  if ('account' in patch) setOrDelete(next, 'account', patch.account || null)
  if ('opportunityId' in patch) {
    const id = patch.opportunityId
    setOrDelete(next, 'opp', id === '' || id == null ? null : String(id))
  }
  if ('instanceId' in patch) {
    const id = patch.instanceId
    setOrDelete(next, 'instance', id === '' || id == null ? null : String(id))
  }

  const filters = patch.filters
  if (filters) {
    setOrDelete(next, 'status', filters.status || null)
    setOrDelete(next, 'structure', filters.structure || null)
    setOrDelete(next, 'symbol', filters.symbol || null)
    setOrDelete(next, 'right', filters.right || null)
    setOrDelete(next, 'expiry', filters.expiry || null)
    // Default since=q is omitted from URL; explicit All clears the param.
    if (!filters.since) next.delete('since')
    else if (filters.since === 'q') next.delete('since')
    else next.set('since', filters.since)
  } else {
    if ('status' in patch) setOrDelete(next, 'status', patch.status || null)
    if ('structure' in patch) setOrDelete(next, 'structure', patch.structure || null)
    if ('symbol' in patch) setOrDelete(next, 'symbol', patch.symbol || null)
    if ('right' in patch) setOrDelete(next, 'right', patch.right || null)
    if ('expiry' in patch) setOrDelete(next, 'expiry', patch.expiry || null)
    if ('since' in patch) {
      const s = patch.since
      if (!s || s === 'q') next.delete('since')
      else next.set('since', s)
    }
  }

  if ('detailViewMode' in patch) {
    const mode = patch.detailViewMode
    if (!mode || mode === 'accordion') next.delete('view')
    else next.set('view', mode)
  }

  return next
}
