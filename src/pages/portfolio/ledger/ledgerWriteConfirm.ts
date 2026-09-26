/** R25 two-step copy. Positions prototype CONFIRM + ledger done note. */

export const LEDGER_WRITE_DONE =
  'Written to the ledger. Nothing was sent to the broker.'

export const LEDGER_WRITE_FOOTER_LINKS =
  'Ledger write · not an order. D10 execution freeze is untouched by this page.'

export const LEDGER_WRITE_FOOTER_JOURNAL =
  'A journal row is an accounting entry with source journal_closed. It carries the JOURNAL badge everywhere it appears and never pretends to be a fill. Nothing is sent to the broker.'

export const LEDGER_CONFIRM_LINKS = {
  title: 'Pair these two fills?',
  body: 'Slippage and role become derived values on both fills; unpair to undo.',
}

export const LEDGER_CONFIRM_JOURNAL_GAP = {
  title: 'Write a journal row?',
  body: 'It will carry the JOURNAL badge in every view, and Performance will read it as book data. This is a bookkeeping entry — it is not sent to the broker and no order is created.',
}

export const LEDGER_CONFIRM_JOURNAL_EXPIRED = {
  title: 'Write a close-out entry?',
  body: 'This writes a reversing fill into the ledger. It is a bookkeeping entry — it is not sent to the broker and no order is created.',
}

export const LEDGER_CONFIRM_SYNC = {
  title: 'Copy instance from the opposite leg?',
  body: 'Attribution is copied from the opposite-side fill with the same quantity in this group. It is a ledger write, not an order.',
}

export const JOURNAL_DATE_NOTE =
  'There is no trade-date field: the write path does not store one for journal rows, so the row lands in the undated group by construction — counted in every total, listed under no month.'

export const JOURNAL_NOTE_DISABLED_TITLE =
  'POST /api/trading/executions has no note field. The row is identified by source journal_closed.'

export const JOURNAL_ASSIGNMENT_DISABLED_TITLE =
  'POST /api/trading/executions has no transaction_type field, so this row cannot be tagged BOOK · assigned. Do not put that tag in the note.'
