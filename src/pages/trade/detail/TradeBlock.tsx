/** One of the Instance page's grouped blocks: a caption, a title, an aside and its body. */
export function TradeBlock({
  cap,
  title,
  note,
  action,
  children,
}: {
  cap: string
  title: string
  note?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="min-w-0 mat-card">
      <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] px-3 py-2">
        <span className="text-dense-micro font-semibold text-muted-foreground">{cap}</span>
        <span className="text-dense-body font-semibold">{title}</span>
        {note ? <span className="text-dense-micro text-muted-foreground text-pretty">{note}</span> : null}
        {action ? <span className="ml-auto">{action}</span> : null}
      </header>
      {children}
    </section>
  )
}
