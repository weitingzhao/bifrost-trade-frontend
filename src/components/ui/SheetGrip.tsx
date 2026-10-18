/**
 * The grip on a compact bottom sheet (DESIGN_CONTRACTS §18.5): a tap switches
 * the two detents; a drag up past 48 goes full; a drag down past 72 drops full
 * to half and half to closed.
 *
 * The package's since D2 (`@bifrost/ui` 0.15.x); the shell's panel and float
 * use it when they land as sheets. This module keeps the app's import path.
 */
import type { ComponentProps } from 'react'
import { SheetGrip } from '@bifrost/ui'

export { SheetGrip } from '@bifrost/ui'
export type SheetGripProps = ComponentProps<typeof SheetGrip>
