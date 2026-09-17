/**
 * Prototype min-width floors (HANDOFF P3 R21). Do not go below.
 *
 * §14.6 lets a floor rise after measuring, never fall. T3 rose from 1180: on
 * DEV its thirteen columns need ~1100px of content before any slack, so at 1180
 * a wider premium or instance label clipped. The open-option detail table is not
 * the prototype's T4 — it keeps Expiry, Strike and Account beside T4's eleven
 * columns — so it carries its own floor.
 */
export const LEDGER_TABLE_MIN_PX = {
  t1: 660,
  t2: 820,
  t3: 1240,
  t4: 1080,
  t4Open: 1320,
  t5: 1160,
} as const

export const ledgerTableMinClass = {
  t1: 'min-w-[660px]',
  t2: 'min-w-[820px]',
  t3: 'min-w-[1240px]',
  t4: 'min-w-[1080px]',
  t4Open: 'min-w-[1320px]',
  t5: 'min-w-[1160px]',
} as const
