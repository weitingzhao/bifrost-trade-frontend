export function LedgerJournalPlaceholderFace() {
  return (
    <div className="flex flex-col gap-2 px-3 py-2.5">
      <span className="text-dense-body font-bold">Journal</span>
      <p className="text-dense-meta text-muted-foreground leading-relaxed">
        Write a ledger row here in the next pass — Close a gap, Expired worthless, Assignment.
        Nothing is written yet. Nothing here is sent to the broker.
      </p>
    </div>
  )
}

export function LedgerLinksPlaceholderFace() {
  return (
    <div className="flex flex-col gap-2 px-3 py-2.5">
      <span className="text-dense-body font-bold">Option ↔ stock links</span>
      <p className="text-dense-meta text-muted-foreground leading-relaxed">
        Linking an option fill to a stock fill lands in this face in the next pass. Existing row
        actions still open the shared link dialog.
      </p>
    </div>
  )
}
