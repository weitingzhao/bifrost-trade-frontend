import { IconActionButton as DsIconActionButton } from '@bifrost/ui'

/**
 * The one close (design Rev .151 `data-sr-close`, @bifrost/ui 0.10.0
 * `IconActionButton variant="close"`): round 22, ink 7% fill, mute ink;
 * hover ink 16%. `size="sm"` is the 16px remove inside a chip. Every ✕ on a
 * sheet, drawer, inspector, panel or chip is this — never a capsule button or
 * a bare glyph.
 */
export function CloseButton({
  onClick,
  label = 'Close',
  title,
  size = 'md',
  className,
}: {
  onClick: (e: React.MouseEvent) => void
  /** The accessible name — say what closes when it is not obvious ("Close explanation"). */
  label?: string
  /** Hover text; defaults to the label. Name the key when Esc also closes. */
  title?: string
  size?: 'md' | 'sm'
  className?: string
}) {
  return (
    <DsIconActionButton
      variant="close"
      onClick={onClick}
      ariaLabel={label}
      title={title ?? label}
      size={size}
      className={className}
    />
  )
}
