import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCrore } from '../../lib/data-utils'
import type { ForecastPoint, HistoryPoint } from '../../lib/types'
import { axisTick, tooltipStyle } from './chart-style'

interface Pt {
  quarter: string
  actual?: number
  forecast?: number
  range?: [number, number] // Prophet ki confidence band [lower, upper]
}

function build(history: HistoryPoint[], forecast: ForecastPoint[]): Pt[] {
  const pts: Pt[] = history.map((h) => ({ quarter: h.quarter, actual: h.y }))
  const last = pts.at(-1)
  if (last) last.forecast = last.actual // forecast line asli line se judi dikhe
  for (const f of forecast) {
    pts.push({ quarter: f.quarter, forecast: f.yhat, range: [f.yhat_lower, f.yhat_upper] })
  }
  return pts
}

const lakh = (v: number) => `${(v / 1e5).toFixed(0)}L`

export default function GdpForecastChart({
  history,
  forecast,
}: {
  history: HistoryPoint[]
  forecast: ForecastPoint[]
}) {
  const data = build(history, forecast)
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--muted)" strokeOpacity={0.25} vertical={false} />
        <XAxis dataKey="quarter" tick={axisTick} interval="preserveStartEnd" minTickGap={40} />
        <YAxis tick={axisTick} tickFormatter={lakh} width={48} domain={['auto', 'auto']} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCrore(Number(v))} />
        <Area
          dataKey="range"
          stroke="none"
          fill="var(--volt)"
          fillOpacity={0.5}
          tooltipType="none"
          isAnimationActive={false}
        />
        <Line
          dataKey="actual"
          name="Actual"
          stroke="var(--ink)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          dataKey="forecast"
          name="Forecast"
          stroke="var(--credit)"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
