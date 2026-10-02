// @vitest-environment jsdom
/**
 * The template editor on api 0.3.0: Info saves as a PATCH whose emptied texts
 * are null, and a refused delete keeps the dialog open with the server's
 * reason (409 names the structures). A template already gone counts as
 * deleted. Every id and name here is invented.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StrategyTemplateDetail } from '@/types/positions'

const DETAIL: StrategyTemplateDetail = {
  strategy_template_id: 4,
  template_code: 'zz_call',
  display_name: 'ZZ call',
  dim_direction: null,
  dim_structure: null,
  dim_coverage: null,
  dim_risk: null,
  dim_volatility: null,
  dim_time: null,
  explanation: '',
  typical_use: null,
  example: null,
  nature: '',
  sort_order: 1,
  is_active: true,
  legs: [],
  meta_params: [],
  characteristics: [],
}

const updateTemplate = vi.fn<(...a: unknown[]) => Promise<StrategyTemplateDetail>>(async () => DETAIL)
const deleteTemplate = vi.fn<(...a: unknown[]) => Promise<unknown>>(async () => ({ deleted: 'hard' }))
vi.mock('@/api/strategy', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/strategy')>()),
  updateTemplate: (...a: unknown[]) => updateTemplate(...a),
  deleteTemplate: (...a: unknown[]) => deleteTemplate(...a),
}))
vi.mock('@/hooks/useStructureManagement', () => ({
  useTemplateDetail: () => ({ data: DETAIL, isLoading: false }),
}))
const none = { data: { options: [] } }
vi.mock('@/hooks/useOptionCategory', () => ({
  useStrategyDims: () => ({ data: { by_type: {} } }),
  useOptionCategoryFormOptions: () => ({ paramKinds: none, legRoles: none, legDirs: none, legOrs: none }),
}))

import { TemplateEditor } from './TemplateEditor'

function renderEditor(onDeleted = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <TemplateEditor templateId={4} onDeleted={onDeleted} />
    </QueryClientProvider>,
  )
  return onDeleted
}

/** The Info section's own buttons (the dialog's carry other names). */
async function clickInfo(name: 'Save' | 'Delete') {
  await userEvent.click(screen.getAllByRole('button', { name })[0])
}

beforeEach(() => {
  updateTemplate.mockClear()
  deleteTemplate.mockReset()
  // The sections' option lists read through the real module; nothing leaves the test.
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ options: [] }), { status: 200 })))
})

afterEach(() => vi.unstubAllGlobals())

describe('TemplateEditor · Info save', () => {
  it('PATCHes with null for the emptied texts — a blank one is refused by the server', async () => {
    renderEditor()
    await clickInfo('Save')
    await waitFor(() => expect(updateTemplate).toHaveBeenCalledTimes(1))
    const [id, body] = updateTemplate.mock.calls[0] as [number, Record<string, unknown>]
    expect(id).toBe(4)
    expect(body).toMatchObject({ template_code: 'zz_call', explanation: null, nature: null, typical_use: null })
  })

  it("shows the server's reason when the save is refused", async () => {
    updateTemplate.mockRejectedValueOnce(new Error('template_code zz_call is already used by another template.'))
    renderEditor()
    await clickInfo('Save')
    expect(await screen.findByText(/already used by another template/)).toBeTruthy()
  })
})

describe('TemplateEditor · delete', () => {
  it('keeps the dialog open with the 409 reason naming the structures', async () => {
    const msg = '2 structures use this template: ZZ 30 delta and Old ZZ (deactivated). Point them at another template first.'
    deleteTemplate.mockRejectedValueOnce(new Error(msg))
    const onDeleted = renderEditor()
    await clickInfo('Delete')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByText(msg)).toBeTruthy()
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('a template already gone (404 → deleted: gone) closes as deleted, no error', async () => {
    deleteTemplate.mockResolvedValueOnce({ deleted: 'gone', detail: 'No template 4.' })
    const onDeleted = renderEditor()
    await clickInfo('Delete')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
