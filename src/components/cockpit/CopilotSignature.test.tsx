/**
 * The meter beside the signature: what the turn took, and what it cost.
 *
 * A rendering test rather than a rule test, because the rule is "print it
 * when it is there and nothing when it is not" — the thing worth holding is
 * that a hydrated message, which records neither, does not borrow a figure.
 */
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { CopilotSignature } from './CopilotSignature'
import type { CopilotUiMessage } from '@/hooks/useCopilotSession'

const msg = (over: Partial<CopilotUiMessage>): CopilotUiMessage => ({
  id: 'm1',
  role: 'assistant',
  content: 'text',
  origin: 'model',
  model: 'deepseek-chat',
  ...over,
})

function draw(m: CopilotUiMessage) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <CopilotSignature message={m} />
    </QueryClientProvider>,
  )
}

describe('CopilotSignature', () => {
  it('prints the turn’s seconds and dollars when the turn recorded them', () => {
    draw(msg({ elapsedMs: 1940, costUsd: 0.06 }))
    expect(screen.getByText('1.9s · $0.06')).toBeInTheDocument()
  })

  it('prints only what it has', () => {
    draw(msg({ elapsedMs: 400 }))
    expect(screen.getByText('0.4s')).toBeInTheDocument()
  })

  it('prints no meter on a message that recorded neither', () => {
    const { container } = draw(msg({}))
    expect(container.textContent).not.toMatch(/\d+\.\d+s/)
    expect(container.textContent).not.toMatch(/\$/)
  })
})
