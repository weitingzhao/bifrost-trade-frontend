import { z } from 'zod'

/**
 * `/api/strategy/preferences/saved-searches` — a page's scope kept under a name
 * (core 0.28.0 `preference_saved_search`, trade design Rev .139). The state is
 * the page's own; this side writes `{ search }`, the page's filter params.
 */
export const SavedSearchSchema = z
  .object({
    preference_saved_search_id: z.number(),
    route: z.string(),
    label: z.string(),
    state_json: z.object({ search: z.string().optional() }).passthrough(),
    created_at: z.string().nullable().optional(),
  })
  .passthrough()

export const SavedSearchesResponseSchema = z
  .object({
    items: z.array(SavedSearchSchema),
    count: z.number(),
  })
  .passthrough()

export type SavedSearch = z.infer<typeof SavedSearchSchema>
export type SavedSearchesResponse = z.infer<typeof SavedSearchesResponseSchema>
