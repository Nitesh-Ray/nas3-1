import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatPercent, type GrowthPoint } from '../../lib/data-utils'
import { axisTick, tooltipStyle } from './chart-style'

// YoY growth bars: badhi = hara (credit), ghati = laal (debit)
export default function GrowthChart({ data }: { data: GrowthPoint[] }) {
  const rows = data.filter((d) => d.growth != null)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--muted)" strokeOpacity={0.25} vertical={false} />
        <XAxis dataKey="label" tick={axisTick} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={axisTick} tickFormatter={(v: number) => `${v}%`} width={44} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => formatPercent(Number(v), 2)}
          cursor={{ fill: 'var(--muted)', fillOpacity: 0.15 }}
        />
        <ReferenceLine y={0} stroke="var(--line)" />
        <Bar dataKey="growth" name="YoY growth" isAnimationActive={false}>
          {rows.map((r) => (
            <Cell key={r.year} fill={(r.growth ?? 0) >= 0 ? 'var(--credit)' : 'var(--debit)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
