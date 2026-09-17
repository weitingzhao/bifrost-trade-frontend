import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TransferPayLookingAt } from './TransferPayLookingAt'
import { KIND_NAMES, type TransactionKind } from './kindRules'
import type { SummaryTypeKey } from '@/utils/transferPay'

const A = 'U17123565'
const B = 'U8829175'
const C = 'U17113214'

function renderPanel(over: Partial<Parameters<typeof TransferPayLookingAt>[0]> = {}) {
  const props: Parameters<typeof TransferPayLookingAt>[0] = {
    accountIds: [A, B, C],
    activeAccountId: 'all',
    onActiveAccountId: vi.fn(),
    accountCounts: { [A]: 70, [B]: 37, [C]: 9 },
    totalCount: 116,
    scopeCount: 116,
    typeFilter: new Set<SummaryTypeKey>(['deposit', 'withdrawal', 'dividend', 'other']),
    typeCounts: { deposit: 7, withdrawal: 6, dividend: 18, other: 85 },
    onToggleType: vi.fn(),
    onToggleAllTypes: vi.fn(),
    kindFilter: new Set<TransactionKind>(),
    kindCounts: {
      'Data fee': 33,
      Lending: 16,
      Financing: 16,
      Tax: 17,
      Cancel: 5,
      Transfer: 11,
      Dividend: 18,
      Other: 0,
    },
    onToggleKind: vi.fn(),
    kindsOpen: true,
    onKindsOpen: vi.fn(),
    pageSize: 15,
    onPageSize: vi.fn(),
    groupByMonth: true,
    onGroupByMonth: vi.fn(),
    totalNet: 6000,
    filteredCount: 116,
    safePage: 1,
    totalPages: 8,
    onPage: vi.fn(),
    ...over,
  }
  return render(<TransferPayLookingAt {...props} />)
}

describe('TransferPayLookingAt chips', () => {
  it('puts a count on every account chip, including the account nobody trades in', () => {
    renderPanel()
    const group = within(screen.getByRole('group', { name: 'Account' }))
    expect(group.getByRole('button', { name: 'All accounts, 116 events' })).toBeInTheDocument()
    expect(group.getByRole('button', { name: `${A}, 70 events` })).toBeInTheDocument()
    expect(group.getByRole('button', { name: `${B}, 37 events` })).toBeInTheDocument()
    expect(group.getByRole('button', { name: `${C}, 9 events` })).toBeInTheDocument()
  })

  it('puts a count on every type chip — the distribution is the finding', () => {
    renderPanel()
    const group = within(screen.getByRole('group', { name: 'Type' }))
    expect(group.getByRole('button', { name: 'All, 116 events' })).toBeInTheDocument()
    expect(group.getByRole('button', { name: 'Deposit, 7 events' })).toBeInTheDocument()
    expect(group.getByRole('button', { name: 'Withdrawal, 6 events' })).toBeInTheDocument()
    expect(group.getByRole('button', { name: 'Dividend, 18 events' })).toBeInTheDocument()
    expect(group.getByRole('button', { name: 'Other, 85 events' })).toBeInTheDocument()
  })

  it('offers every kind chip with its count, and names Financing as one class both ways', () => {
    renderPanel()
    const group = within(screen.getByRole('group', { name: 'Kind' }))
    const counts = [33, 16, 16, 17, 5, 11, 18, 0]
    KIND_NAMES.forEach((k, i) => {
      expect(group.getByRole('button', { name: `${k}, ${counts[i]} events` }), k).toBeInTheDocument()
    })
    expect(group.getByRole('button', { name: 'Financing, 16 events' })).toHaveAttribute(
      'title',
      expect.stringContaining('both directions'),
    )
  })

  it('prints the classification rules on the page, so a reader can check them', () => {
    renderPanel()
    expect(screen.getByText(/CANCEL\* → Cancel/)).toBeInTheDocument()
    expect(screen.getByText(/SYEP\|MANAGED SECURITIES → Lending/)).toBeInTheDocument()
    expect(screen.getByText(/ - US TAX → Tax/)).toBeInTheDocument()
  })

  it('says Kind is a reading of this page, not a field from IB', () => {
    renderPanel()
    expect(screen.getByText(/a reading of this page, not a field from IB/)).toBeInTheDocument()
  })

  it('hides the kind panel when it is closed', () => {
    renderPanel({ kindsOpen: false })
    expect(screen.queryByText(/CANCEL\* → Cancel/)).not.toBeInTheDocument()
  })
})

describe('TransferPayLookingAt net cash', () => {
  it('follows the selection and says how much of the ledger it covers', () => {
    renderPanel({ totalNet: -30000, filteredCount: 6 })
    expect(screen.getByText('-$30,000.00')).toBeInTheDocument()
    expect(screen.getByText('6 of 116 events')).toBeInTheDocument()
  })

  it('reads a dash with nothing selected, because $0.00 would claim the cash nets out', () => {
    renderPanel({ filteredCount: 0, totalNet: 0 })
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument()
  })

  it('hides pagination when there is nothing to page through', () => {
    renderPanel({ filteredCount: 0 })
    expect(screen.queryByText(/Page 1 of/)).not.toBeInTheDocument()
  })
})

describe('TransferPayLookingAt paging', () => {
  it('disables the edge it is already on', () => {
    renderPanel({ safePage: 1, totalPages: 8 })
    expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
    expect(screen.getByText('Page 1 of 8')).toBeInTheDocument()
  })

  it('disables Next on the last page', () => {
    renderPanel({ safePage: 8, totalPages: 8 })
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })
})
