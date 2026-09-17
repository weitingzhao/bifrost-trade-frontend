import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LedgerWriteCommitButton } from './LedgerWriteCommitButton'

function renderButton(onCommit: () => Promise<void>) {
  render(
    <LedgerWriteCommitButton
      idleLabel="Write journal row"
      confirmTitle="Write this row?"
      confirmBody="It goes to the ledger, not the broker."
      onCommit={onCommit}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Write journal row' }))
}

describe('LedgerWriteCommitButton', () => {
  it('writes once when Confirm is clicked twice before the first write returns', async () => {
    let finish: () => void = () => {}
    const onCommit = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
    renderButton(onCommit)

    const confirm = screen.getByRole('button', { name: 'Confirm' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Writing…' })).toBeDisabled()
    finish()
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
  })

  it('lets a failed write be retried once it has come back', async () => {
    const onCommit = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('server said no'))
      .mockResolvedValueOnce(undefined)
    renderButton(onCommit)

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('server said no'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
    expect(onCommit).toHaveBeenCalledTimes(2)
  })
})
