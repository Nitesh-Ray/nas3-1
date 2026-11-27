import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import Card from '../components/Card'
import GrowthChart from '../components/charts/GrowthChart'
import TrendChart from '../components/charts/TrendChart'
import QueryState from '../components/QueryState'
import { useAllData } from '../hooks/useApi'
import { annualSeries, formatCrore, formatPercent, sectorGrowth, yoyGrowth } from '../lib/data-utils'

const BASE = '2011-12'

export default function SectorDetail() {
  const { name = '' } = useParams() // URL se sector ka naam (/sectors/Mining)
  const gva = useAllData({ indicator: 'Gross Value Added', frequency: 'Annual', base_year: BASE })

  const view = useMemo(() => {
    const all = gva.data ?? []
    const rows = all.filter((r) => r.industry === name)

    const growth = yoyGrowth(annualSeries(rows, 'constant_price'))
    const currentByYear = new Map(annualSeries(rows, 'current_price').map((p) => [p.year, p.value]))
    const trend = growth.map((p) => ({
      label: p.label,
      constant: p.value,
      current: currentByYear.get(p.year) ?? null,
    }))

    // Sab sectors ke beech iska hissa aur rank (latest saal)
    const { items } = sectorGrowth(all, 'constant_price')
    const total = items.reduce((s, i) => s + i.value, 0)
    const me = items.find((i) => i.industry === name)
    const share = me && total > 0 ? (me.value / total) * 100 : null
    const rank = [...items].sort((a, b) => b.value - a.value).findIndex((i) => i.industry === name) + 1

    return { found: rows.length > 0, growth, trend, latest: growth.at(-1), share, rank, count: items.length }
  }, [gva.data, name])

  return (
    <div className="space-y-8">
      <Link to="/sectors" className="font-mono text-sm underline decoration-2 hover:bg-volt hover:text-black">
        ← All sectors
      </Link>
      <h1 className="font-display text-4xl">{name.toUpperCase()}</h1>
      <QueryState isPending={gva.isPending} error={gva.error} />

      {!gva.isPending && !gva.error && !view.found && (
        <p className="font-mono text-sm text-debit">"{name}" naam ka koi sector nahi mila.</p>
      )}

      {view.found && view.latest && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <Card title={`GVA ${view.latest.label}`}>
              <p className="font-display text-3xl">{formatCrore(view.latest.value)}</p>
              <p className={`text-sm ${(view.latest.growth ?? 0) >= 0 ? 'text-credit' : 'text-debit'}`}>
                {formatPercent(view.latest.growth)} YoY
              </p>
            </Card>
            <Card title="Share of all sectors">
              <p className="font-display text-3xl">{view.share == null ? '—' : `${view.share.toFixed(1)}%`}</p>
              <p className="text-sm text-muted">constant price, latest saal</p>
            </Card>
            <Card title="Rank by size">
              <p className="font-display text-3xl">{view.rank > 0 ? `#${view.rank}` : '—'}</p>
              <p className="text-sm text-muted">{view.count} sectors me se</p>
            </Card>
          </div>

          <Card title="GVA over time: constant vs current price">
            <TrendChart data={view.trend} />
            <p className="mt-3 max-w-2xl text-sm text-muted">
              Dono lines ka gap mehngai dikhata hai. Asli growth hamesha constant price (kaali line) se dekhte hain.
            </p>
          </Card>

          <Card title="Growth, year on year">
            <GrowthChart data={view.growth} />
          </Card>
        </>
      )}
    </div>
  )
}
