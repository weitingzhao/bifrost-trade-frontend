interface QualityItem {
  label: string
  title?: string
}

interface Props {
  items: QualityItem[]
}

/** Chain snapshot data-quality strip (IV / Greeks / freshness). */
export function OptionDataQualityBadge({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-[0.7rem]">
      <span className="font-bold uppercase tracking-wide text-muted-foreground">Data Quality</span>
      {items.map((item) => (
        <span
          key={item.label}
          className="rounded bg-muted px-2 py-px font-semibold text-foreground"
          title={item.title}
        >
          {item.label}
        </span>
      ))}
    </div>
  )
}
