/**
 * The bottom sheet (design Rev .163, DESIGN_CONTRACTS §18.5) — what every
 * float becomes on compact, and the shell's own confirm sheet everywhere.
 *
 * The package's since D2 (Rev .176): `@bifrost/ui` 0.15.x B1 took this file's
 * component as it was (`open` · `onOpenChange` · `title` · `meta` · `head` ·
 * `label` · `material` · `detent` · `actions[]` · `bodyClassName` · `flush`),
 * and under the root `LayoutProvider` it pins to the bottom on compact with
 * the grip and drops from under the top bar as a 480 form sheet elsewhere.
 * This module keeps the app's import path.
 */
import type { ComponentProps } from 'react'
import { BottomSheet } from '@bifrost/ui'

export { BottomSheet, type BottomSheetAction } from '@bifrost/ui'
export type BottomSheetProps = ComponentProps<typeof BottomSheet>
