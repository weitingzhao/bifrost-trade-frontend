export default function TransferPayPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transfer & Pay</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cash transfers and payment history — migration in progress.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
        Not yet migrated from Legacy.
      </div>
    </div>
  )
}
