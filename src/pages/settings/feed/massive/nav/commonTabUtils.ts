import { feedMassiveCommonSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import { commonFeedChecklistRows } from '@/pages/settings/feed/massive/checklist/optionStatus'

const COMMON_ROW_IDS = new Set(commonFeedChecklistRows().map(r => r.id))

const LEGACY_HASH_ALIASES: Record<string, string> = {
  'feed-massive-svc-technical-indicators': 'technical-indicators',
  'feed-massive-tab-technical-indicators': 'technical-indicators',
  'feed-massive-svc-market-ops': 'market-ops',
  'feed-massive-tab-market-ops': 'market-ops',
}

export function normalizeCommonCapId(raw: string): string | null {
  const id = LEGACY_HASH_ALIASES[raw] ?? raw
  if (COMMON_ROW_IDS.has(id)) return id
  return null
}

export function feedMassiveCommonCapHash(capId: string): string {
  return `#${feedMassiveCommonSvcAnchorId(capId)}`
}

export function parseFeedMassiveCommonSvcFromHash(hash: string): string | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  if (h.startsWith('feed-massive-common-svc-')) {
    const id = h.slice('feed-massive-common-svc-'.length)
    return id ? normalizeCommonCapId(id) : null
  }
  return null
}

export function resolveCommonRowIdFromHash(hash: string): string | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  if (LEGACY_HASH_ALIASES[h]) return LEGACY_HASH_ALIASES[h]
  return parseFeedMassiveCommonSvcFromHash(hash)
}
