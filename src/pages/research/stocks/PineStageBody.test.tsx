// @vitest-environment jsdom
/**
 * A pick of a script now off in the Pine library (Rev .161): kept after the
 * live rows as a faint, inert capsule per side with its own ✕ at the right
 * end; the ✕ removes that one side. Script ids invented.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PineStageBody } from './PineStageBody'
import { stagesWithPine } from './stockScreenStages'

const stage = stagesWithPine([{ id: 'supertrend', label: 'Supertrend', origin: 'bifrost' }]).find(
  (s) => s.id === 'pine'
)!

describe('Pine stage · a switched-off script', () => {
  it('draws one inert capsule per side, each with its own ✕', async () => {
    const onChip = vi.fn()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { enabled: false } } })}
      >
        <MemoryRouter>
          <PineStageBody
            stage={stage}
            screen={{
              on: {
                'pine:supertrend:buy': true,
                'pine:old_cross:buy': true,
                'pine:old_cross:sell': true,
              },
              mins: {},
            }}
            chipCountOf={() => ({ n: 3, where: '' })}
            onChip={onChip}
            onPine={() => {}}
          />
        </MemoryRouter>
      </QueryClientProvider>
    )
    const caps = screen.getAllByTitle('script off — switched off in the Pine library')
    expect(caps).toHaveLength(2)
    caps.forEach((c) => expect(c.getAttribute('aria-disabled')).toBe('true'))
    expect(screen.getByText('off')).toBeTruthy() // origin unknown until the library answers
    await userEvent.click(
      within(caps[1]).getByRole('button', { name: 'Remove old_cross sell from this screen' })
    )
    expect(onChip).toHaveBeenCalledWith('pine:old_cross:sell', 'old_cross sell (off)')
    expect(onChip).toHaveBeenCalledTimes(1)
  })
})
