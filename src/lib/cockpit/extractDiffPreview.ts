/**
 * Detect dry_run write preview in a tool_result envelope (Wave RS-E4).
 */
import type { DiffPreviewPayload } from '@/components/cockpit/DiffPayloadRenderer'

export function extractDiffPreview(result: unknown): DiffPreviewPayload | null {
  if (!result || typeof result !== 'object') return null
  const root = result as { ok?: boolean; data?: unknown }
  if (root.ok === false) return null
  const data = root.data
  if (!data || typeof data !== 'object') return null
  const d = data as DiffPreviewPayload & { executed?: boolean }
  if (d.dry_run !== true) return null
  if (!d.diff_kind || !d.preview) return null
  return d
}
