import { useMemo } from 'react'
import Card from '../components/Card'
import SeasonChart from '../components/charts/SeasonChart'
import QueryState from '../components/QueryState'
import { useAllData } from '../hooks/useApi'
import { filterRows, quarterlySeries, seasonalIndex } from '../lib/data-utils'

export default function Seasonality() {
  const gdp = useAllData({
    indicator: 'Gross Domestic Product',
    frequency: 'Quarterly',
    base_year: '2011-12',
  })

  const season = useMemo(() => {
    const rows = filterRows(gdp.data ?? [], { industry: null })
    return seasonalIndex(quarterlySeries(rows, 'constant_price'))
  }, [gdp.data])

  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">SEASONALITY</h1>
      <Card title="Quarterly GDP: saal ke average se farak (%)">
        <QueryState isPending={gdp.isPending} error={gdp.error} />
        {season.length > 0 && <SeasonChart data={season} />}
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Har saal ke 4 quarters ka average nikala, phir dekha ki Q1–Q4 usse kitne % upar/neeche rehte hain, aur
          sab saalon ka average liya. Ye simple ratio hai. Isme saal ke andar ki growth bhi thodi mili hoti hai,
          isliye Q4 aksar upar dikhta hai. Prophet ye trend alag karke seasonality nikalta hai.
        </p>
      </Card>
    </div>
  )
}
