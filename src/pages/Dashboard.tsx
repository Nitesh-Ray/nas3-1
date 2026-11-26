import { useMemo } from 'react'
import AnomalyTable from '../components/AnomalyTable'
import Card from '../components/Card'
import GdpForecastChart from '../components/charts/GdpForecastChart'
import GrowthChart from '../components/charts/GrowthChart'
import SectorChart from '../components/charts/SectorChart'
import QueryState from '../components/QueryState'
import { useAllData, useBacktest, useForecast, useHistory } from '../hooks/useApi'
import {
  annualSeries,
  filterRows,
  formatCrore,
  formatPercent,
  industryValues,
  yoyGrowth,
} from '../lib/data-utils'

const BASE = '2011-12' // lamba history isi base year me hai

export default function Dashboard() {
  const gdp = useAllData({ indicator: 'Gross Domestic Product', frequency: 'Annual', base_year: BASE })
  const gva = useAllData({ indicator: 'Gross Value Added', frequency: 'Annual', base_year: BASE })
  const history = useHistory()
  const forecast = useForecast(4)
  const backtest = useBacktest()

  // Annual GDP (constant price) + YoY growth
  const growth = useMemo(() => {
    const rows = filterRows(gdp.data ?? [], { industry: null })
    return yoyGrowth(annualSeries(rows, 'constant_price'))
  }, [gdp.data])
  const latest = growth.at(-1)

  // Latest saal ke top-10 sectors
  const sectors = useMemo(() => {
    const rows = (gva.data ?? []).filter((r) => r.industry)
    if (rows.length === 0) return { year: null, data: [] }
    const year = Math.max(...rows.map((r) => r.year_int ?? 0))
    return { year, data: industryValues(rows, year, 'constant_price').slice(0, 10) }
  }, [gva.data])

  const nextQ = forecast.data?.[0]

  return (
    <div className="space-y-8">
      <h1 className="font-display text-4xl">DASHBOARD</h1>

      {/* KPI row */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card title={`GDP ${latest?.label ?? ''} (constant ${BASE})`}>
          <QueryState isPending={gdp.isPending} error={gdp.error} />
          {latest && (
            <>
              <p className="font-display text-3xl">{formatCrore(latest.value)}</p>
              <p className={`text-sm ${(latest.growth ?? 0) >= 0 ? 'text-credit' : 'text-debit'}`}>
                {formatPercent(latest.growth)} YoY
              </p>
            </>
          )}
        </Card>
        <Card title="Next quarter forecast">
          <QueryState isPending={forecast.isPending} error={forecast.error} />
          {nextQ && (
            <>
              <p className="font-display text-3xl">{formatCrore(nextQ.yhat)}</p>
              <p className="text-sm text-muted">{nextQ.quarter}</p>
            </>
          )}
        </Card>
        <Card title={`Backtest ${backtest.data?.test_year ?? ''}`}>
          <QueryState isPending={backtest.isPending} error={backtest.error} />
          {backtest.data && (
            <>
              <p className="font-display text-3xl">{backtest.data.metrics.mape_pct}% MAPE</p>
              <p className="text-sm text-muted">
                MAE {formatCrore(backtest.data.metrics.mae)} · RMSE {formatCrore(backtest.data.metrics.rmse)}
              </p>
            </>
          )}
        </Card>
      </div>

      <Card title="Quarterly GDP + Prophet forecast (band = confidence range)">
        <QueryState isPending={history.isPending || forecast.isPending} error={history.error ?? forecast.error} />
        {history.data && forecast.data && <GdpForecastChart history={history.data} forecast={forecast.data} />}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="GDP growth, year on year">
          <QueryState isPending={gdp.isPending} error={gdp.error} />
          {growth.length > 0 && <GrowthChart data={growth} />}
        </Card>
        <Card title={`Top sectors by GVA ${sectors.year ?? ''}`}>
          <QueryState isPending={gva.isPending} error={gva.error} />
          {sectors.data.length > 0 && <SectorChart data={sectors.data} />}
        </Card>
      </div>

      <Card title="Anomaly review">
        <AnomalyTable />
      </Card>
    </div>
  )
}
