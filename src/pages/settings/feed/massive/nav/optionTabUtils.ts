import { optionFeedChecklistRows } from '@/pages/settings/feed/massive/checklist/optionStatus'

export const FEED_MASSIVE_TAB_PREFIX = 'feed-massive-tab-'

const OPTION_ROW_IDS = new Set(optionFeedChecklistRows().map(r => r.id))

/** Legacy hash ids before kind rename. */
const LEGACY_TAB_ALIASES: Record<string, string> = {
  snapshot: 'feed_option_snapshots',
  aggregates: 'feed_options_aggregate',
}

export function normalizeOptionTabId(raw: string): string | null {
  const id = LEGACY_TAB_ALIASES[raw] ?? raw
  if (OPTION_ROW_IDS.has(id)) return id
  return null
}

export function feedMassiveOptionTabHash(tabId: string): string {
  return `#${FEED_MASSIVE_TAB_PREFIX}${tabId}`
}

export function parseFeedMassiveTabFromHash(hash: string): string | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  if (h.startsWith(FEED_MASSIVE_TAB_PREFIX)) {
    const id = h.slice(FEED_MASSIVE_TAB_PREFIX.length)
    return id ? normalizeOptionTabId(id) : null
  }
  return null
}

export function parseFeedMassiveSvcFromHash(hash: string): string | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  if (h.startsWith('feed-massive-svc-')) {
    const id = h.slice('feed-massive-svc-'.length)
    return id ? normalizeOptionTabId(id) : null
  }
  return null
}

export function resolveOptionRowIdFromHash(hash: string): string | null {
  return parseFeedMassiveTabFromHash(hash) ?? parseFeedMassiveSvcFromHash(hash)
}
