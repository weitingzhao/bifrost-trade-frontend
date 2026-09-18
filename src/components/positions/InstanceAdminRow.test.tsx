// @vitest-environment jsdom
/**
 * The row writes a name and nothing else.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/strategy', () => ({ patchStrategyInstance: vi.fn(async () => ({ ok: true })) }))

import { patchStrategyInstance } from '@/api/strategy'
import { InstanceAdminRow, type InstanceAdminReading } from './InstanceAdminRow'

const patch = vi.mocked(patchStrategyInstance)

function renderRow(instance: InstanceAdminReading) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <InstanceAdminRow instance={instance} />
    </QueryClientProvider>,
  )
}

const RUNNING: InstanceAdminReading = { id: 142, label: 'MU cash-secured put', status: 'running' }

beforeEach(() => patch.mockClear())

describe('InstanceAdminRow · rename', () => {
  it('leaves Apply disabled until the label actually changes', async () => {
    renderRow(RUNNING)
    expect(screen.getByRole('button', { name: 'Apply' }).hasAttribute('disabled')).toBe(true)
    await userEvent.type(screen.getByLabelText('Instance label'), '!')
    expect(screen.getByRole('button', { name: 'Apply' }).hasAttribute('disabled')).toBe(false)
  })

  it('stays disabled when the only edit is whitespace — a rename to the same name is not a write', async () => {
    renderRow(RUNNING)
    await userEvent.type(screen.getByLabelText('Instance label'), '   ')
    expect(screen.getByRole('button', { name: 'Apply' }).hasAttribute('disabled')).toBe(true)
  })

  it('PATCHes the label alone, trimmed', async () => {
    renderRow(RUNNING)
    const input = screen.getByLabelText('Instance label')
    await userEvent.clear(input)
    await userEvent.type(input, '  MU 45d put  ')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(patch).toHaveBeenCalledWith(142, { label: 'MU 45d put' })
  })

  it('refuses to un-name an instance rather than reporting a write that never happens', async () => {
    // Measured on DEV: the endpoint skips a null label and answers ok, so a
    // clear would print "saved" over an unchanged row.
    renderRow(RUNNING)
    await userEvent.clear(screen.getByLabelText('Instance label'))
    expect(screen.getByRole('button', { name: 'Apply' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(/cannot be taken off from here/)).toBeTruthy()
    expect(patch).not.toHaveBeenCalled()
  })

  it('goes quiet again after a save — the new name is what the server holds', async () => {
    renderRow(RUNNING)
    await userEvent.type(screen.getByLabelText('Instance label'), '!')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText(/saved — the label only/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Apply' }).hasAttribute('disabled')).toBe(true)
  })

  it('says the rename failed rather than reading as saved', async () => {
    patch.mockRejectedValueOnce(new Error('PATCH /strategies/instances/142: 500'))
    renderRow(RUNNING)
    await userEvent.type(screen.getByLabelText('Instance label'), '!')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText(/500/)).toBeTruthy()
    expect(screen.queryByText(/saved/)).toBeNull()
  })
})

describe('InstanceAdminRow · status is a reading', () => {
  it('draws all three states the design names and operates none of them', () => {
    // No status column exists on strategy_instance: running / closed come from
    // fills and paused has nowhere to live. Dropping the control would hide
    // that; wiring it would look like it saved.
    renderRow(RUNNING)
    for (const name of ['running', 'paused', 'closed']) {
      expect(screen.getByRole('button', { name }).hasAttribute('disabled')).toBe(true)
    }
  })

  it('shows the state the fills give it', () => {
    renderRow({ ...RUNNING, status: 'closed' })
    expect(screen.getByRole('button', { name: 'closed' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'running' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('never offers Apply as the way to close an instance', () => {
    renderRow(RUNNING)
    expect(screen.getByText(/a close is never written here/)).toBeTruthy()
  })
})
