/** A refused delete keeps the dialog open and says why (TD-16). Message invented. */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/http'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

describe('DeleteConfirmDialog', () => {
  it('shows the server reason and stays open when the delete is refused', async () => {
    const onClose = vi.fn()
    const onConfirm = vi.fn(async () => {
      throw new HttpError(404, 'Delete failed (account_executions_id missing or database error).')
    })
    render(<DeleteConfirmDialog open title="Delete execution" message="Sure?" onClose={onClose} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Delete failed (account_executions_id missing or database error).',
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes after a delete that went through', async () => {
    const onClose = vi.fn()
    render(<DeleteConfirmDialog open title="Delete execution" message="Sure?" onClose={onClose} onConfirm={async () => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
