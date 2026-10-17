/**
 * Draws the shell's imperative sheet (`shellSheet.ts`): the touch layer's
 * order confirm and a kept table's row detail.
 */
import { BottomSheet } from '@/components/ui/BottomSheet'
import { closeShellSheet, useShellSheet } from './shellSheet'

export function ShellSheetHost() {
  const { sheet, open } = useShellSheet()
  if (!sheet) return null
  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) closeShellSheet()
      }}
      title={sheet.title}
      label={sheet.label}
      meta={sheet.meta}
      material={sheet.material}
      detent={sheet.detent}
      actions={sheet.actions}
    >
      {sheet.body}
    </BottomSheet>
  )
}
