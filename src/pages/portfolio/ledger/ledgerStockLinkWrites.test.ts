import { describe, expect, it, vi } from 'vitest'
import { writeStockLinks } from './ledgerStockLinkWrites'

describe('writeStockLinks', () => {
  it('refuses an empty selection instead of reporting a write', async () => {
    const write = vi.fn()
    await expect(writeStockLinks([], write, () => {})).rejects.toThrow('nothing was written')
    expect(write).not.toHaveBeenCalled()
  })

  it('reports each link as it lands, so a retry after a failure posts only the rest', async () => {
    const write = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, error: 'stock fill already linked elsewhere' })
    const linked: number[] = []
    await expect(writeStockLinks([101, 102, 103], write, id => linked.push(id))).rejects.toThrow(
      'already linked elsewhere',
    )
    expect(linked).toEqual([101])
    expect(write).toHaveBeenCalledTimes(2)
  })

  it('keeps the API warnings', async () => {
    const write = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, warning: 'quantity exceeds the option size' })
      .mockResolvedValueOnce({ ok: true })
    await expect(writeStockLinks([1, 2], write, () => {})).resolves.toEqual({
      warnings: ['quantity exceeds the option size'],
    })
  })
})
