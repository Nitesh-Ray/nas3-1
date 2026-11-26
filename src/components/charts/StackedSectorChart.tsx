import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCrore, type YearRow } from '../../lib/data-utils'
import { axisTick, tooltipStyle } from './chart-style'

const COLORS = ['#d4ff3a', '#0a8f4e', '#d6303a', '#6b9bff', '#ff9f1c', '#9b5de5']

// Sector-wise GVA, saal dar saal, ek ke upar ek (stacked)
export default function StackedSectorChart({ data, industries }: { data: YearRow[]; industries: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--muted)" strokeOpacity={0.25} vertical={false} />
        <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" minTickGap={30} />
        <YAxis tick={axisTick} tickFormatter={(v: number) => `${(v / 1e5).toFixed(0)}L`} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCrore(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} />
        {industries.map((ind, i) => (
          <Area
            key={ind}
            type="monotone"
            dataKey={ind}
            stackId="gva"
            stroke="var(--line)"
            strokeWidth={1}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.85}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
