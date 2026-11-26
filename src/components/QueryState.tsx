// Loading / error / empty ka ek hi jagah ka UI
export default function QueryState({
  isPending,
  error,
}: {
  isPending: boolean
  error: unknown
}) {
  if (isPending) return <p className="font-mono text-sm text-muted">Loading…</p>
  if (error) {
    return (
      <p className="font-mono text-sm text-debit">
        {error instanceof Error ? error.message : 'Kuch gadbad hui'}
      </p>
    )
  }
  return null
}
