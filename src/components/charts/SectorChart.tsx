import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCrore, type IndustryValue } from '../../lib/data-utils'
import { axisTick, tooltipStyle } from './chart-style'

// Top sectors (GVA): horizontal bars, bade se chhota
export default function SectorChart({ data }: { data: IndustryValue[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--muted)" strokeOpacity={0.25} horizontal={false} />
        <XAxis
          type="number"
          tick={axisTick}
          tickFormatter={(v: number) => `${(v / 1e5).toFixed(0)}L`}
        />
        <YAxis type="category" dataKey="industry" tick={axisTick} width={170} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => formatCrore(Number(v))}
          cursor={{ fill: 'var(--muted)', fillOpacity: 0.15 }}
        />
        <Bar dataKey="value" name="GVA" fill="var(--volt)" stroke="var(--line)" strokeWidth={2} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
