export type StockLinkWriteResult = { ok: boolean; error?: string; warning?: string | null }

/**
 * Link stock fills to one option fill, one POST each, in order.
 *
 * Each fill is reported through `onLinked` as soon as its POST lands, so the caller
 * can drop it from the selection: after a failure part-way through, a retry
 * posts only what is still unlinked instead of duplicating what is already there.
 * The API's warnings are collected, not discarded. The first failure throws.
 */
export async function writeStockLinks(
  stockFillIds: readonly number[],
  write: (stockFillId: number) => Promise<StockLinkWriteResult>,
  onLinked: (stockFillId: number) => void,
): Promise<{ warnings: string[] }> {
  if (stockFillIds.length === 0) throw new Error('Select at least one stock fill — nothing was written.')
  const warnings: string[] = []
  for (const id of stockFillIds) {
    const res = await write(id)
    if (!res.ok) {
      const err = new Error(res.error ?? 'Link failed') as Error & { warnings?: string[] }
      err.warnings = warnings
      throw err
    }
    if (res.warning) warnings.push(res.warning)
    onLinked(id)
  }
  return { warnings }
}
