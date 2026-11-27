import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import StackedSectorChart from '../components/charts/StackedSectorChart'
import QueryState from '../components/QueryState'
import { useAllData } from '../hooks/useApi'
import { formatCrore, formatPercent, sectorGrowth, sectorMatrix } from '../lib/data-utils'

const BASE = '2011-12'

function Mover({ industry, growth }: { industry: string; growth: number | null }) {
  return (
    <li className="flex justify-between gap-4 border-b border-line/30 py-1 text-sm">
      <Link
        to={`/sectors/${encodeURIComponent(industry)}`}
        className="underline decoration-2 hover:bg-volt hover:text-black"
      >
        {industry}
      </Link>
      <span className={`font-mono ${(growth ?? 0) >= 0 ? 'text-credit' : 'text-debit'}`}>
        {formatPercent(growth)}
      </span>
    </li>
  )
}

export default function Sectors() {
  const gva = useAllData({ indicator: 'Gross Value Added', frequency: 'Annual', base_year: BASE })

  const view = useMemo(() => {
    const rows = gva.data ?? []
    const { year, items } = sectorGrowth(rows, 'constant_price')
    const bySize = [...items].sort((a, b) => b.value - a.value)
    const withGrowth = items.filter((i) => i.growth != null).sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))
    const top6 = bySize.slice(0, 6).map((i) => i.industry)
    return {
      year,
      bySize,
      best: withGrowth.slice(0, 3),
      worst: withGrowth.slice(-3).reverse(),
      top6,
      matrix: sectorMatrix(rows, top6, 'constant_price'),
    }
  }, [gva.data])

  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">SECTORS</h1>
      <QueryState isPending={gva.isPending} error={gva.error} />

      {view.year && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Card title={`Fastest growing ${view.year}-${String(view.year + 1).slice(-2)}`}>
              <ul>{view.best.map((s) => <Mover key={s.industry} {...s} />)}</ul>
            </Card>
            <Card title="Slowest / contracting">
              <ul>{view.worst.map((s) => <Mover key={s.industry} {...s} />)}</ul>
            </Card>
          </div>

          <Card title="Top 6 sectors, GVA over time (constant 2011-12)">
            <StackedSectorChart data={view.matrix} industries={view.top6} />
          </Card>

          <Card title="All sectors">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-volt text-black">
                  <tr>
                    <th className="p-2">Sector</th>
                    <th className="p-2 text-right">GVA</th>
                    <th className="p-2 text-right">YoY</th>
                  </tr>
                </thead>
                <tbody>
                  {view.bySize.map((s) => (
                    <tr key={s.industry} className="border-t border-line/30">
                      <td className="p-2">
                        <Link
                          to={`/sectors/${encodeURIComponent(s.industry)}`}
                          className="underline decoration-2 hover:bg-volt hover:text-black"
                        >
                          {s.industry}
                        </Link>
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">{formatCrore(s.value)}</td>
                      <td className={`p-2 text-right ${(s.growth ?? 0) >= 0 ? 'text-credit' : 'text-debit'}`}>
                        {formatPercent(s.growth)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
