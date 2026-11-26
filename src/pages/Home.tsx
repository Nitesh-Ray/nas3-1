import Card from '../components/Card'
import { useForecast, useHistory, useStatus } from '../hooks/useApi'
import { formatCrore } from '../lib/data-utils'

function Err({ error }: { error: unknown }) {
  return <p className="text-debit">{error instanceof Error ? error.message : 'Kuch gadbad hui'}</p>
}

// Phase 6 ka smoke test: frontend -> proxy -> FastAPI -> DB / Prophet, poora chain
export default function Home() {
  const status = useStatus()
  const history = useHistory()
  const forecast = useForecast(4)

  const last = history.data?.at(-1)
  const next = forecast.data?.[0]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-5xl leading-none md:text-7xl">
          INDIA&apos;S ECONOMY,
          <br />
          <span className="bg-volt px-2 text-black">IN NUMBERS.</span>
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          National Accounts Statistics: GDP, sectors, trade aur ek Prophet forecast.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card title="Data pipeline">
          {status.isPending && <p>Loading…</p>}
          {status.isError && <Err error={status.error} />}
          {status.data && (
            <>
              <p className="font-display text-3xl">{status.data.rows_processed ?? '—'}</p>
              <p className="text-sm text-muted">
                rows ingested · {status.data.success ? 'success' : (status.data.status ?? 'failed')}
              </p>
            </>
          )}
        </Card>

        <Card title="Latest GDP quarter">
          {history.isPending && <p>Loading…</p>}
          {history.isError && <Err error={history.error} />}
          {last && (
            <>
              <p className="font-display text-3xl">{formatCrore(last.y)}</p>
              <p className="text-sm text-muted">
                {last.quarter} · {history.data?.length} quarters of history
              </p>
            </>
          )}
        </Card>

        <Card title="Next quarter forecast">
          {forecast.isPending && <p>Loading…</p>}
          {forecast.isError && <Err error={forecast.error} />}
          {next && (
            <>
              <p className="font-display text-3xl">{formatCrore(next.yhat)}</p>
              <p className="text-sm text-muted">
                {next.quarter} · range {formatCrore(next.yhat_lower)} – {formatCrore(next.yhat_upper)}
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
