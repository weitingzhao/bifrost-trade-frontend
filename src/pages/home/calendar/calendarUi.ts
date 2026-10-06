/**
 * How the Calendar inks a line, and how an item reads in full — shared by the
 * grid's cells, the List and the day panel.
 */
import type { CalendarInk, CalendarItem } from '@/lib/calendar/calendarLayers'

/** The prototype's inks: macro ink, contract sky, ticker lime, profit, soft, mute (Rev .145; profit Rev .157). */
const INK: Record<CalendarInk, string> = {
  macro: 'text-foreground',
  contract: 'text-entity-option',
  sym: 'text-entity-symbol',
  profit: 'text-profit',
  soft: 'text-[var(--sk-soft)]',
  mute: 'text-[var(--sk-mute2)]',
}

/** The ink a line is drawn in: the item's own — a past layer's rows are soft, a dividend profit, a print its ticker. */
export function calendarInkClass(ink: CalendarInk): string {
  return INK[ink]
}

/** One item's full line, the symbol first when it names one (the week column, the List). */
export function itemLine(i: CalendarItem): string {
  return i.syms.length === 1 && !i.text.includes(i.syms[0]) ? `${i.syms[0]} · ${i.text}` : i.text
}

/**
 * An item's text beside its symbol button (the day panel): the name is
 * already on the button, so a fill's `BUY HIMS 18DEC26 40C ×5` reads
 * `BUY 18DEC26 40C ×5`, as the prototype's `STO 145P ×2` does.
 */
export function textBesideSymbol(text: string, sym: string): string {
  if (!sym) return text
  const out = text.replace(new RegExp(`(^|\\s)${sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`), '$1').trim()
  return out || text
}
